from typing import Protocol
from pathlib import PurePosixPath
from contextlib import AbstractAsyncContextManager


class MissingFileError(FileNotFoundError):
    """Report that a requested file is absent from Solution storage."""


class File(Protocol):
    """Read stored bytes without blocking the event loop."""

    async def read(self, size: int = -1, /) -> bytes:
        """Read at most size bytes, or the remaining content when omitted."""
        ...


class Storage(Protocol):
    """Provide scoped asynchronous object storage for a Solution."""

    def open(self, path: str) -> AbstractAsyncContextManager[File]:
        """Open an owned reader, raising MissingFileError for an absent stored file."""
        ...

    async def write(self, path: str, content: bytes) -> None:
        """Create or replace an object, including its parent directories."""
        ...

    async def exists(self, path: str) -> bool:
        """Report whether an object exists in this Solution's storage."""
        ...

    async def remove(self, path: str) -> None:
        """Remove an object if it exists."""
        ...

    async def close(self) -> None:
        """Release connections owned by this storage instance."""
        ...


def relative_path(path: str) -> str:
    """Reject object paths that could escape the configured storage scope."""

    # Use the same relative POSIX paths for local files and remote object keys.
    value = PurePosixPath(path)
    if not value.parts or value.is_absolute() or ".." in value.parts or "\\" in path or "\x00" in path:
        raise ValueError("Storage paths must be relative paths inside the Solution")
    return value.as_posix()
