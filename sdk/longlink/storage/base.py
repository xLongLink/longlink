import fsspec

from longlink.utils.settings import Settings


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


def create_storage(env: Settings) -> Storage:
    """Create Storage instance from environment settings."""

    if env.DEV:
        fs = fsspec.filesystem("file")
    else:
        fs = fsspec.filesystem(
            "s3",
            key=env.storage_key,
            secret=env.storage_secret,
            client_kwargs={"endpoint_url": env.storage_endpoint},
        )
    return Storage(fs)


def get_storage(env: Settings) -> Storage:
    """Backward-compatible alias for storage factory."""

    return create_storage(env)
