import sys
import json
import httpx2
import pytest
import importlib
from anyio import Event, AsyncFile, CancelScope, fail_after, sleep_forever, create_task_group
from types import ModuleType
from typing import BinaryIO, cast
from pathlib import Path
from datetime import UTC, datetime
from sqlmodel import SQLModel
from contextlib import asynccontextmanager
from longlink.app import LongLink
from collections.abc import Iterator, AsyncIterator, AsyncGenerator
from starlette.types import Scope, Message
from longlink.storage import File
from longlink.constants import ROOT
from longlink.database.base import LOCAL_USER_ID
from longlink.storage.filesystem import Filesystem
from fsspec.implementations.dirfs import DirFileSystem
from fsspec.implementations.local import LocalFileSystem


@pytest.fixture(scope="module")
def task_routes() -> Iterator[ModuleType]:
    """Import the shipped Solution routes without retaining their table metadata."""

    # Load the actual scaffold, rather than a copy of its streaming implementation.
    existing_modules = set(sys.modules)
    existing_tables = set(SQLModel.metadata.tables)
    with pytest.MonkeyPatch.context() as monkeypatch:
        monkeypatch.syspath_prepend(ROOT / ".static" / "new")
        try:
            yield importlib.import_module("src.routes.tasks")
        finally:
            for name in set(SQLModel.metadata.tables) - existing_tables:
                SQLModel.metadata.remove(SQLModel.metadata.tables[name])
            for name in set(sys.modules) - existing_modules:
                if name == "src" or name.startswith("src."):
                    sys.modules.pop(name)


@pytest.fixture
async def stored_file(
    task_routes: ModuleType, solution_source: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> AsyncIterator[tuple[LongLink, bytes, list[BinaryIO]]]:
    """Keep real request services and observe local file handles through app shutdown."""

    # Include binary values and exceed one chunk to expose truncation and text conversion.
    content = bytes(range(256)) * 8193
    path = tmp_path / "tasks" / "1" / "attachment"
    path.parent.mkdir(parents=True)
    path.write_bytes(content)
    filesystem = DirFileSystem(path=tmp_path.as_posix(), fs=LocalFileSystem(auto_mkdir=True, skip_instance_cache=True))
    storage = Filesystem(filesystem)
    handles: list[BinaryIO] = []
    original_open = storage.open

    @asynccontextmanager
    async def observe_open(path: str) -> AsyncGenerator[File]:
        """Retain real handles without replacing reads or close operations."""

        async with original_open(path) as handle:
            reader = cast(AsyncFile[bytes], handle)
            handles.append(cast(BinaryIO, reader.wrapped))
            yield handle

    # Resolve storage paths relative to the isolated Solution directory.
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    monkeypatch.setattr(storage, "open", observe_open)
    app = LongLink()
    app.state.longlink.storage = storage
    app.include_router(task_routes.router)
    try:
        async with app.state.longlink.database.session() as session:
            for task_id, attachment in ((1, "report.pdf"), (2, None), (3, "missing.pdf")):
                task = task_routes.Task(
                    id=task_id,
                    title="Report",
                    attachment=attachment,
                    created_id=LOCAL_USER_ID,
                    updated_id=LOCAL_USER_ID,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC),
                )
                session.add(task)
            await session.commit()
        yield app, content, handles
    finally:
        await app.state.longlink.database.dispose()
        for handle in handles:
            handle.close()


@pytest.fixture
def scope() -> Scope:
    """Describe a real HTTP request using ASGI send-failure disconnect semantics."""

    return {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.4"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": "/api/tasks/1/attachment",
        "raw_path": b"/api/tasks/1/attachment",
        "root_path": "",
        "query_string": b"",
        "headers": [],
        "client": ("127.0.0.1", 1234),
        "server": ("testserver", 80),
    }


async def receive() -> Message:
    """Keep the request connected until the server transport finishes or fails."""

    await sleep_forever()
    return {"type": "http.disconnect"}


async def test_attachment_streams_binary_and_closes(stored_file: tuple[LongLink, bytes, list[BinaryIO]], scope: Scope) -> None:
    """Stream every binary byte with inferred media type and no disposition policy."""

    # Arrange
    app, content, handles = stored_file
    messages: list[Message] = []

    async def send(message: Message) -> None:
        """Collect the actual response at the server transport boundary."""

        messages.append(message)

    # Act
    async with app.router.lifespan_context(app):
        await app(scope, receive, send)

    # Assert
    assert messages[0]["status"] == 200
    headers = dict(messages[0]["headers"])
    assert headers[b"content-type"] == b"application/pdf"
    assert b"content-disposition" not in headers
    bodies = [message["body"] for message in messages if message["type"] == "http.response.body"]
    assert b"".join(bodies) == content
    assert len([body for body in bodies if body]) > 1
    assert len(handles) == 1
    assert handles[0].closed


async def test_uploaded_attachment_can_be_streamed(stored_file: tuple[LongLink, bytes, list[BinaryIO]]) -> None:
    """Keep native async upload storage compatible with the same preview/download route."""

    # Arrange
    app, content, handles = stored_file
    transport = httpx2.ASGITransport(app=app)

    # Act
    async with app.router.lifespan_context(app), httpx2.AsyncClient(transport=transport, base_url="http://solution") as client:
        created = await client.post("/api/tasks", data={"title": "Uploaded report"}, files={"attachment": ("résumé.pdf", content)})
        assert created.status_code == 201
        task_id = created.json()["id"]
        response = await client.get(f"/api/tasks/{task_id}/attachment")

    # Assert
    assert created.json()["attachment"] == "résumé.pdf"
    assert response.status_code == 200
    assert response.content == content
    assert response.headers["content-type"] == "application/pdf"
    assert "content-disposition" not in response.headers
    assert len(handles) == 1
    assert handles[0].closed


@pytest.mark.parametrize(
    ("task_id", "detail"),
    [(999, "Attachment not found"), (2, "Attachment not found"), (3, "File not found")],
    ids=["missing-task", "no-attachment", "missing-storage"],
)
async def test_missing_attachment_returns_404_before_streaming(
    stored_file: tuple[LongLink, bytes, list[BinaryIO]], scope: Scope, task_id: int, detail: str
) -> None:
    """Resolve missing tasks and files before committing successful stream headers."""

    # Arrange
    app, _content, handles = stored_file
    scope["path"] = f"/api/tasks/{task_id}/attachment"
    scope["raw_path"] = scope["path"].encode()
    messages: list[Message] = []

    async def send(message: Message) -> None:
        """Collect response status and body without buffering a response object."""

        messages.append(message)

    # Act
    async with app.router.lifespan_context(app):
        await app(scope, receive, send)

    # Assert
    assert messages[0]["status"] == 404
    assert dict(messages[0]["headers"])[b"content-type"] == b"application/json"
    content = b"".join(message["body"] for message in messages if message["type"] == "http.response.body")
    assert json.loads(content) == {"detail": detail}
    assert not handles


async def test_attachment_closes_after_send_failure(stored_file: tuple[LongLink, bytes, list[BinaryIO]], scope: Scope) -> None:
    """Unwind FastAPI's file dependency when a partial response cannot be sent."""

    # Arrange
    app, _content, handles = stored_file
    failure = RuntimeError("transport failed")

    async def send(message: Message) -> None:
        """Fail while the real file is open and the response is incomplete."""

        if message["type"] == "http.response.body":
            assert message["body"]
            assert message["more_body"]
            assert not handles[0].closed
            raise failure

    # Act
    async with app.router.lifespan_context(app):
        with pytest.raises(RuntimeError) as error:
            await app(scope, receive, send)

    # Assert
    assert error.value is failure
    assert handles[0].closed


async def test_attachment_closes_after_cancellation(stored_file: tuple[LongLink, bytes, list[BinaryIO]], scope: Scope) -> None:
    """Close the dependency's file even inside a cancelled request lifetime."""

    # Arrange
    app, _content, handles = stored_file
    sending = Event()
    finished = Event()
    cancellation = CancelScope()

    async def send(message: Message) -> None:
        """Suspend a partially sent response with its actual file still open."""

        if message["type"] == "http.response.body":
            assert message["body"]
            assert message["more_body"]
            assert not handles[0].closed
            sending.set()
            await sleep_forever()

    async def stream() -> None:
        """Run the entire application inside the request cancellation scope."""

        with cancellation:
            await app(scope, receive, send)
        finished.set()

    # Act
    async with app.router.lifespan_context(app):
        with fail_after(5):
            async with create_task_group() as tasks:
                tasks.start_soon(stream)
                await sending.wait()
                cancellation.cancel()
                await finished.wait()

                # Assert before fixture teardown can close any leaked handles.
                assert cancellation.cancelled_caught
                assert handles[0].closed
