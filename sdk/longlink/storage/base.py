import fsspec
from pathlib import PurePosixPath
from fsspec.spec import AbstractFileSystem
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem


def create_fs() -> AbstractFileSystem:
    """Create the active Application filesystem from runtime settings."""

    env = Envs()
    bucket = env.STORAGE_BUCKET or ""
    prefix = env.STORAGE_PREFIX or ""

    # Reject bucket paths that could alter or escape the configured storage scope.
    bucket_path = PurePosixPath(bucket)
    if bucket and (bucket_path.is_absolute() or not bucket_path.parts or ".." in bucket_path.parts):
        raise ValueError("Storage buckets must be bucket names")

    # Normalize only safe relative prefixes so a scoped view cannot escape its bucket.
    prefix_path = PurePosixPath(prefix)
    if prefix and (prefix_path.is_absolute() or not prefix_path.parts or ".." in prefix_path.parts):
        raise ValueError("Storage prefixes must be relative paths inside a bucket")
    if prefix and not bucket:
        raise ValueError("Storage prefixes require a bucket")

    # Tests use isolated in-memory storage so they never touch local files or remote services.
    if env.ENV == "testing":
        filesystem = fsspec.filesystem("memory")

    # Development uses the local filesystem so generated files remain easy to inspect.
    elif env.ENV == "development":
        filesystem = fsspec.filesystem("file")

    # Production uses remote object storage supplied by the platform.
    else:

        # Production runtimes receive S3 connection options from the LongLink Platform.
        options: dict[str, object] = {
            "endpoint_url": env.STORAGE_ENDPOINT_URL,
            "key": env.STORAGE_USERNAME,
            "secret": env.STORAGE_PASSWORD,
            "client_kwargs": {"region_name": env.STORAGE_REGION},
        }
        filesystem = fsspec.filesystem(
            "s3",
            **options,
        )

    # Scope configured prefixes beneath their bucket while local defaults keep the backend root.
    if bucket:
        return DirFileSystem(path=(bucket_path / prefix_path).as_posix(), fs=filesystem)

    return filesystem
