import anyio
from io import BytesIO
from s3fs import S3FileSystem
from anyio import Lock, CancelScope, to_thread
from typing import TYPE_CHECKING, BinaryIO, cast
from pathlib import Path
from contextlib import AsyncExitStack, asynccontextmanager
from fsspec.asyn import AsyncFileSystem
from collections.abc import AsyncGenerator
from longlink.storage import tls
from longlink.storage.base import File, MissingFileError, relative_path
from fsspec.implementations.dirfs import DirFileSystem
from fsspec.implementations.local import LocalFileSystem
from fsspec.implementations.memory import MemoryFileSystem
from fsspec.implementations.asyn_wrapper import AsyncFileSystemWrapper

if TYPE_CHECKING:
    from types_aiobotocore_s3 import S3Client


class Filesystem:
    """Expose scoped fsspec filesystems through the SDK's async storage contract."""

    def __init__(self, filesystem: DirFileSystem, certificate: str | None = None) -> None:
        """Retain one filesystem and adapt synchronous backends without blocking routes."""

        self.filesystem = filesystem
        self._async: AsyncFileSystem = filesystem if filesystem.fs.async_impl else AsyncFileSystemWrapper(fs=filesystem, asynchronous=True)
        self._certificate = certificate
        self._lock = Lock()
        self._stack: AsyncExitStack | None = None

    async def _connect(self) -> None:
        """Initialize the S3 session once and own its certificate until shutdown."""

        # Other backends have no client connections to initialize.
        backend = self.filesystem.fs
        if not isinstance(backend, S3FileSystem):
            return

        # Keep concurrent first requests on one native async connection pool.
        async with self._lock:
            if self._stack is None:
                async with AsyncExitStack() as stack:
                    if self._certificate is not None:
                        backend.client_kwargs["verify"] = stack.enter_context(tls.certificate_file(self._certificate))
                    session = cast("S3Client", await backend.set_session(refresh=True))
                    stack.push_async_callback(session.close)
                    self._stack = stack.pop_all()

    async def _path(self, path: str) -> str:
        """Validate object paths before fsspec adds the configured directory prefix."""

        # Local symlinks must not redirect operations outside the Solution root.
        key = relative_path(path)
        if isinstance(self.filesystem.fs, LocalFileSystem):
            root = Path(self.filesystem.path)
            candidate = anyio.Path(root / key)
            resolved = Path(await candidate.resolve())
            if not resolved.is_relative_to(root):
                raise ValueError("Storage paths must be relative paths inside the Solution")
            return resolved.relative_to(root).as_posix()
        return key

    @asynccontextmanager
    async def open(self, path: str) -> AsyncGenerator[File]:
        """Open before response headers and release readers on completion or cancellation."""

        # Use s3fs's scoped client directly to own the HTTP streaming body's lifetime.
        key = await self._path(path)
        await self._connect()
        backend = self.filesystem.fs
        if isinstance(backend, S3FileSystem):
            bucket, object_key, _ = backend.split_path(self.filesystem._join(key))
            try:
                result = await backend._call_s3("get_object", Bucket=bucket, Key=object_key)
            except FileNotFoundError as error:
                raise MissingFileError(path) from error
            body = result["Body"]
            try:
                yield body
            finally:
                body.close()
            return

        # MemoryFileSystem shares cursors, so give concurrent readers independent snapshots.
        handle: BinaryIO
        try:
            if isinstance(backend, MemoryFileSystem):
                handle = BytesIO(await self._async._cat_file(key))
            else:
                handle = cast(BinaryIO, await to_thread.run_sync(self.filesystem.open, key, "rb"))
        except FileNotFoundError as error:
            raise MissingFileError(path) from error
        stored_file = anyio.wrap_file(handle)
        try:
            yield stored_file
        finally:
            with CancelScope(shield=True):
                await stored_file.aclose()

    async def write(self, path: str, content: bytes) -> None:
        """Create or replace bytes using the backend's async filesystem operation."""

        key = await self._path(path)
        await self._connect()
        with CancelScope(shield=True):
            await self._async._pipe_file(key, content)

    async def exists(self, path: str) -> bool:
        """Check for a file without confusing denied access with absence."""

        key = await self._path(path)
        await self._connect()
        try:
            info = await self._async._info(key)
        except FileNotFoundError:
            return False
        return info["type"] == "file"

    async def remove(self, path: str) -> None:
        """Remove one object without glob expansion or errors for missing files."""

        key = await self._path(path)
        await self._connect()
        try:
            await self._async._rm_file(key)
        except FileNotFoundError:
            pass

    async def close(self) -> None:
        """Close the S3 session before removing its temporary certificate."""

        with CancelScope(shield=True):
            async with self._lock:
                if self._stack is not None:
                    await self._stack.aclose()
                    self._stack = None
