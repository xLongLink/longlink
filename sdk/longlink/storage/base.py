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
        # Require a bucket so production storage is never exposed from its backend root.
        if not bucket:
            raise ValueError("Production storage settings require a bucket")

        # Require all production storage credentials before constructing the backend.
        if (
            env.STORAGE_ENDPOINT_URL is None
            or env.STORAGE_USERNAME is None
            or env.STORAGE_PASSWORD is None
        ):
            raise ValueError(
                "Production storage settings require endpoint URL, username, and password"
            )

        # Production runtimes receive S3 connection options from the LongLink Platform.
        filesystem = fsspec.filesystem(
            "s3",
            endpoint_url=env.STORAGE_ENDPOINT_URL,
            key=env.STORAGE_USERNAME,
            secret=env.STORAGE_PASSWORD,
        )

    # Scope configured buckets while keeping local storage roots available for development and tests.
    if bucket:
        return DirFileSystem(path=bucket, fs=filesystem)

    return filesystem
