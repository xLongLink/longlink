import mimetypes
from anyio import CancelScope, to_thread
from typing import Literal
from pathlib import PurePosixPath
from fsspec.spec import AbstractFileSystem
from urllib.parse import quote
from collections.abc import AsyncIterator
from starlette.types import Send
from starlette.responses import StreamingResponse


class FileResponse(StreamingResponse):
    """Stream an fsspec file and close it throughout the response lifecycle."""

    def __init__(
        self,
        storage: AbstractFileSystem,
        path: str,
        *,
        filename: str | None = None,
        media_type: str | None = None,
        content_disposition_type: Literal["inline", "attachment"] = "inline",
    ) -> None:
        """Describe a stored file without opening it before the response starts."""

        # Restrict the disposition to supported browser behaviors.
        if content_disposition_type not in {"inline", "attachment"}:
            raise ValueError("Content disposition must be inline or attachment")

        # Infer the display name and content type independently of the storage backend.
        self.storage = storage
        self.path = path
        filename = filename if filename is not None else PurePosixPath(path).name
        media_type = media_type if media_type is not None else mimetypes.guess_type(filename)[0] or "application/octet-stream"

        # Follow Starlette's filename encoding without permitting header control characters.
        encoded_name = quote(filename, safe="")
        disposition = (
            f"{content_disposition_type}; filename*=utf-8''{encoded_name}"
            if encoded_name != filename
            else f'{content_disposition_type}; filename="{filename}"'
        )
        super().__init__((), media_type=media_type, headers={"content-disposition": disposition})

    async def stream_response(self, send: Send) -> None:
        """Own the file outside the iterator so interrupted sends also release it."""

        # Open synchronous local, memory, and S3 files without blocking the event loop.
        stored_file = await to_thread.run_sync(self.storage.open, self.path, "rb")
        try:

            async def content() -> AsyncIterator[bytes]:
                """Read bounded chunks through the filesystem's synchronous interface."""

                # Offload remote reads while keeping only one chunk in flight.
                while chunk := await to_thread.run_sync(stored_file.read, 1024 * 1024):
                    yield chunk

            # Let Starlette handle response messages and client disconnects.
            self.body_iterator = content()
            await super().stream_response(send)
        finally:
            # Finish cleanup even when Starlette cancels streaming on disconnect.
            with CancelScope(shield=True):
                await to_thread.run_sync(stored_file.close)
