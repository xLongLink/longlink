import fsspec
from typing import Any
from fastapi import Request


class Storage:
    """Thin wrapper around fsspec filesystem read/write operations."""

    def __init__(self, fs: fsspec.AbstractFileSystem):
        """Store filesystem client used for IO operations."""

        self.fs = fs

    def write_bytes(self, path: str, data: bytes) -> None:
        """Write raw bytes to path using configured filesystem backend."""

        with self.fs.open(path, "wb") as file_handle:
            file_handle.write(data)

    def read_bytes(self, path: str) -> bytes:
        """Read raw bytes from path using configured filesystem backend."""

        with self.fs.open(path, "rb") as file_handle:
            return file_handle.read()


def get_storage(request: Request) -> Storage:
    """Create request-scoped storage client from app state filesystem."""

    fs = request.app.state.fs
    return Storage(fs)