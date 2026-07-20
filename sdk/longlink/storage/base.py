import fsspec
from pathlib import PurePosixPath
from fsspec.spec import AbstractFileSystem
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem


def create_fs(env: Envs, bucket: str, prefix: str) -> AbstractFileSystem:
    """Create the active runtime filesystem scoped to one bucket prefix."""

    # Production must always use a scoped view of the Organization bucket.
    if env.ENV == "production":
        if not bucket:
            raise ValueError("Production storage settings require a bucket")
        if not prefix:
            raise ValueError("Production storage settings require a prefix")

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
        options: dict[str, object] = {
            "endpoint_url": env.STORAGE_ENDPOINT_URL,
            "key": env.STORAGE_USERNAME,
            "secret": env.STORAGE_PASSWORD,
        }
        if env.STORAGE_REGION is not None:
            options["client_kwargs"] = {"region_name": env.STORAGE_REGION}
        filesystem = fsspec.filesystem(
            "s3",
            **options,
        )

    # Scope configured prefixes beneath their bucket while local defaults keep the backend root.
    if prefix:
        return DirFileSystem(path=(PurePosixPath(bucket) / prefix_path).as_posix(), fs=filesystem)
    if bucket:
        return DirFileSystem(path=bucket, fs=filesystem)

    return filesystem
