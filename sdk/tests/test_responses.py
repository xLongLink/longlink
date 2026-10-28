import pytest
from anyio import Event, CancelScope, fail_after, sleep_forever, create_task_group
from typing import BinaryIO, cast
from pathlib import Path
from collections.abc import Iterator
from starlette.types import Message
from longlink.responses import FileResponse
from fsspec.implementations.local import LocalFileSystem


@pytest.fixture
def stored_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[tuple[LocalFileSystem, str, bytes, list[BinaryIO]]]:
    """Observe real local handles without replacing file reads or cleanup."""

    # Write more than one response chunk so interruptions precede completion.
    path = tmp_path / "report.bin"
    content = b"a" * (1024 * 1024) + b"end"
    path.write_bytes(content)
    storage = LocalFileSystem(skip_instance_cache=True)
    handles: list[BinaryIO] = []
    original_open = storage.open

    def observe_open(path: str, mode: str) -> BinaryIO:
        """Retain the actual handle returned by the filesystem boundary."""

        # Keep the real file implementation and response-owned close intact.
        handle = cast(BinaryIO, original_open(path, mode))
        handles.append(handle)
        return handle

    monkeypatch.setattr(storage, "open", observe_open)
    try:
        yield storage, str(path), content, handles
    finally:

        # Release leaked handles only after each test checks response cleanup.
        for handle in handles:
            handle.close()


async def receive() -> Message:
    """Provide the unused receive boundary for ASGI 2.4 streaming."""

    # Modern ASGI servers report disconnects through send failures.
    return {"type": "http.disconnect"}


async def test_file_response_closes_after_success(stored_file: tuple[LocalFileSystem, str, bytes, list[BinaryIO]]) -> None:
    """Stream the complete stored payload and close its handle before returning."""

    # Arrange
    storage, path, content, handles = stored_file
    response = FileResponse(storage, path)
    messages: list[Message] = []

    async def send(message: Message) -> None:
        """Collect messages at the server transport boundary."""

        messages.append(message)

    # Act
    await response({"type": "http", "asgi": {"spec_version": "2.4"}}, receive, send)

    # Assert
    assert b"".join(message["body"] for message in messages if message["type"] == "http.response.body") == content
    assert handles[0].closed


async def test_file_response_closes_after_send_failure(stored_file: tuple[LocalFileSystem, str, bytes, list[BinaryIO]]) -> None:
    """Preserve a failed send's error while closing the still-active file."""

    # Arrange
    storage, path, _content, handles = stored_file
    response = FileResponse(storage, path)
    failure = RuntimeError("transport failed")

    async def send(message: Message) -> None:
        """Fail transport while the first non-final file chunk is being sent."""

        # Verify this is an interrupted open file, not a completed response.
        if message["type"] == "http.response.body":
            assert message["body"]
            assert message["more_body"]
            assert not handles[0].closed
            raise failure

    # Act
    with pytest.raises(RuntimeError) as error:
        await response({"type": "http", "asgi": {"spec_version": "2.4"}}, receive, send)

    # Assert
    assert error.value is failure
    assert handles[0].closed


async def test_file_response_closes_after_cancellation(stored_file: tuple[LocalFileSystem, str, bytes, list[BinaryIO]]) -> None:
    """Shield file cleanup when cancellation interrupts a suspended send."""

    # Arrange
    storage, path, _content, handles = stored_file
    response = FileResponse(storage, path)
    sending = Event()
    finished = Event()
    cancellation = CancelScope()

    async def send(message: Message) -> None:
        """Suspend the server transport with an open, partially read file."""

        # Signal only after the response reaches its first body chunk.
        if message["type"] == "http.response.body":
            assert message["body"]
            assert message["more_body"]
            assert not handles[0].closed
            sending.set()
            await sleep_forever()

    async def stream() -> None:
        """Run the real ASGI response inside a cancellable operation lifetime."""

        # Report completion only after response cleanup and scope exit.
        with cancellation:
            await response({"type": "http", "asgi": {"spec_version": "2.4"}}, receive, send)
        finished.set()

    # Act
    with fail_after(5):
        async with create_task_group() as tasks:
            tasks.start_soon(stream)
            await sending.wait()
            cancellation.cancel()
            await finished.wait()

            # Assert before task-group or filesystem fixture teardown.
            assert cancellation.cancelled_caught
            assert handles[0].closed
