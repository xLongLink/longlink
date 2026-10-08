import pytest
import asyncio
from pathlib import Path
from contextlib import suppress
from starlette.types import Scope, Message
from longlink.responses import FileResponse
from fsspec.implementations.local import LocalFileOpener, LocalFileSystem


async def test_file_response_closes_real_file_when_body_delivery_is_cancelled(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Close the owned file when cancellation interrupts sending an already-read body chunk."""

    # Arrange
    path = tmp_path / "report.txt"
    path.write_bytes(b"report content")
    filesystem = LocalFileSystem(
        skip_instance_cache=True,
    )
    open_file = filesystem.open
    stored_file: LocalFileOpener | None = None
    entered = asyncio.Event()
    release = asyncio.Event()

    def observe_open(path: str, mode: str) -> LocalFileOpener:
        """Retain the real handle without replacing filesystem or file behavior."""

        nonlocal stored_file
        stored_file = open_file(path, mode)
        return stored_file

    monkeypatch.setattr(filesystem, "open", observe_open)

    async def receive() -> Message:
        """Supply the empty request body for the response's ASGI boundary."""

        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: Message) -> None:
        """Suspend response delivery after a real file chunk has been read."""

        # Header delivery stays real; only the external body consumer is blocked.
        if message["type"] == "http.response.body":
            assert message["body"] == b"report content"
            assert message["more_body"] is True
            entered.set()
            await release.wait()

    scope: Scope = {"type": "http", "asgi": {"version": "3.0", "spec_version": "2.4"}}
    response = FileResponse(
        filesystem,
        str(path),
    )

    # Act: exercise the complete response lifecycle, not its private body iterator.
    delivery = asyncio.create_task(response(scope, receive, send))
    try:
        async with asyncio.timeout(5):
            await entered.wait()
            assert stored_file is not None
            assert not stored_file.closed
            delivery.cancel()
            with pytest.raises(asyncio.CancelledError):
                await delivery

        # Assert before defensive test cleanup can close the observed file.
        assert not release.is_set()
        assert stored_file.closed
    finally:
        # Always settle the response task and close the retained handle on assertion failure.
        release.set()
        delivery.cancel()
        try:
            async with asyncio.timeout(5):
                with suppress(asyncio.CancelledError):
                    await delivery
        finally:
            if stored_file is not None:
                stored_file.close()
