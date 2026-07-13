import fsspec
from fsspec.spec import AbstractFileSystem
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem


def create_fs(env: Envs, bucket: str) -> AbstractFileSystem:
    """Create the active runtime filesystem, optionally scoped to one bucket path."""

    # Tests use isolated in-memory storage so they never touch local files or remote services.
    if env.ENV == "testing":
        filesystem = fsspec.filesystem("memory")

    # Development uses the local filesystem so generated files remain easy to inspect.
    elif env.ENV == "development":
        filesystem = fsspec.filesystem("file")

    # Production uses remote object storage supplied by the platform.
    else:
        # Require all production storage credentials before constructing the backend.
        if env.STORAGE_ENDPOINT_URL is None or env.STORAGE_USERNAME is None or env.STORAGE_PASSWORD is None:
            raise ValueError("Production storage settings require endpoint URL, username, and password")

        # Production runtimes receive S3 connection options from the LongLink Platform.
        filesystem = fsspec.filesystem(
            "s3",
            endpoint_url=env.STORAGE_ENDPOINT_URL,
            key=env.STORAGE_USERNAME,
            secret=env.STORAGE_PASSWORD,
        )

    # A bucket turns the filesystem into a scoped view; an empty bucket keeps the backend root.
    if bucket:
        return DirFileSystem(path=bucket, fs=filesystem)

    return filesystem
