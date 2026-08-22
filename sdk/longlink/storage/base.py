import fsspec
from pathlib import PurePosixPath
from fsspec.spec import AbstractFileSystem
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem


def create_fs(settings: Envs) -> AbstractFileSystem:
    """Create the active Application filesystem from runtime settings."""

    bucket = settings.STORAGE_BUCKET or ""
    prefix = settings.STORAGE_PREFIX or ""

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

    # Production uses remote object storage supplied by the platform.
    if settings.ENV == "production":
        filesystem = fsspec.filesystem(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT_URL,
            key=settings.STORAGE_USERNAME,
            secret=settings.STORAGE_PASSWORD,
            client_kwargs={"region_name": settings.STORAGE_REGION},
        )
    else:
        # Tests use memory storage while development keeps generated files locally inspectable.
        filesystem = fsspec.filesystem("memory" if settings.ENV == "testing" else "file")

    # Scope configured prefixes beneath their bucket while local defaults keep the backend root.
    if bucket:
        return DirFileSystem(path=(bucket_path / prefix_path).as_posix(), fs=filesystem)

    return filesystem
