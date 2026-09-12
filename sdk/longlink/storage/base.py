import fsspec
import weakref
from pathlib import PurePosixPath
from contextlib import ExitStack
from fsspec.spec import AbstractFileSystem
from longlink.storage import tls
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem


def create_fs(settings: Envs) -> AbstractFileSystem:
    """Create the active Solution filesystem from runtime settings."""

    bucket_path = PurePosixPath(settings.STORAGE_BUCKET) if settings.STORAGE_BUCKET else None
    prefix_path = PurePosixPath(settings.STORAGE_PREFIX) if settings.STORAGE_PREFIX else None

    # Reject bucket paths that could alter or escape the configured storage scope.
    if bucket_path is not None and (bucket_path.is_absolute() or not bucket_path.parts or ".." in bucket_path.parts):
        raise ValueError("Storage buckets must be bucket names")

    # Normalize only safe relative prefixes so a scoped view cannot escape its bucket.
    if prefix_path is not None and (prefix_path.is_absolute() or not prefix_path.parts or ".." in prefix_path.parts):
        raise ValueError("Storage prefixes must be relative paths inside a bucket")
    if prefix_path is not None and bucket_path is None:
        raise ValueError("Storage prefixes require a bucket")

    # Production uses remote object storage supplied by the platform.
    if settings.ENV == "production":
        # s3fs connects lazily, so transfer CA cleanup only after constructing its owning filesystem.
        with ExitStack() as files:
            certificate = None
            if settings.STORAGE_CERTIFICATE is not None:
                certificate = files.enter_context(tls.certificate_file(settings.STORAGE_CERTIFICATE))
            filesystem = fsspec.filesystem(
                "s3",
                endpoint_url=settings.STORAGE_ENDPOINT_URL,
                key=settings.STORAGE_USERNAME,
                secret=settings.STORAGE_PASSWORD,
                client_kwargs={"region_name": settings.STORAGE_REGION, **({"verify": certificate} if certificate is not None else {})},
                config_kwargs={"s3": {"addressing_style": "path"}, "http_session_cls": tls.Session},
                skip_instance_cache=True,
            )
            if certificate is not None:
                weakref.finalize(filesystem, files.pop_all().close)
    else:
        # Tests use memory storage while development keeps generated files locally inspectable.
        filesystem = fsspec.filesystem("memory" if settings.ENV == "testing" else "file")

    # Scope configured prefixes beneath their bucket while local defaults keep the backend root.
    if bucket_path is not None:
        return DirFileSystem(path=(bucket_path / prefix_path if prefix_path is not None else bucket_path).as_posix(), fs=filesystem)

    return filesystem
