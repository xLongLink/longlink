import fsspec
import weakref
from uuid import uuid4
from pathlib import Path, PurePosixPath
from contextlib import ExitStack
from fsspec.spec import AbstractFileSystem
from longlink.storage import tls
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem


def _remove_memory_directory(filesystem: AbstractFileSystem, directory: str) -> None:
    """Remove only the in-memory directory owned by a collected testing filesystem."""

    # A Solution may have already removed its storage root before runtime cleanup.
    if filesystem.exists(directory):
        filesystem.rm(directory, recursive=True)


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

    # Compose the validated scope once for every storage backend.
    scope = bucket_path
    if scope is not None and prefix_path is not None:
        scope /= prefix_path

    # Production uses remote object storage supplied by the platform.
    if settings.ENV == "production":
        # s3fs connects lazily, so transfer CA cleanup only after constructing its owning filesystem.
        with ExitStack() as files:
            certificate = (
                files.enter_context(tls.certificate_file(settings.STORAGE_CERTIFICATE))
                if settings.STORAGE_CERTIFICATE is not None
                else None
            )
            filesystem = fsspec.filesystem(
                "s3",
                endpoint_url=settings.STORAGE_ENDPOINT_URL,
                key=settings.STORAGE_USERNAME,
                secret=settings.STORAGE_PASSWORD,
                client_kwargs={"region_name": settings.STORAGE_REGION, **({"verify": certificate} if certificate is not None else {})},
                # Keep the runtime's TLS-aware transport and path-style bucket addressing.
                config_kwargs={"s3": {"addressing_style": "path"}, "http_session_cls": tls.Session},
                skip_instance_cache=True,
            )
            if certificate is not None:
                weakref.finalize(filesystem, files.pop_all().close)

    # fsspec memory storage is process-global, so each runtime owns a separate directory.
    elif settings.ENV == "testing":
        memory = fsspec.filesystem("memory")
        directory = f"/longlink-testing-{uuid4()}"
        memory.mkdir(directory)

        # Combine the namespace and optional bucket scope without nesting filesystem wrappers.
        storage_path = PurePosixPath(directory)
        if scope is not None:
            storage_path /= scope
        filesystem = DirFileSystem(path=storage_path.as_posix(), fs=memory, skip_instance_cache=True)

        # Release only this namespace when its owning runtime filesystem is collected.
        weakref.finalize(filesystem, _remove_memory_directory, memory, directory)
        return filesystem
    else:
        # Development keeps generated files inside a dedicated local directory.
        storage_path = Path.cwd() / ".storage"
        if scope is not None:
            storage_path /= scope
        storage_path.mkdir(parents=True, exist_ok=True)
        filesystem = fsspec.filesystem("file")
        return DirFileSystem(path=storage_path.as_posix(), fs=filesystem, skip_instance_cache=True)

    # Scope paths without letting the wrapper cache retain the backend and its CA file.
    if scope is not None:
        return DirFileSystem(path=scope.as_posix(), fs=filesystem, skip_instance_cache=True)

    return filesystem
