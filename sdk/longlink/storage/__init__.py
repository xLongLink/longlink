import fsspec
import weakref
from uuid import uuid4
from pathlib import Path, PurePosixPath
from longlink.storage import tls
from longlink.storage.base import File, Storage, MissingFileError
from longlink.utils.settings import Envs
from longlink.storage.filesystem import Filesystem
from fsspec.implementations.dirfs import DirFileSystem
from fsspec.implementations.memory import MemoryFileSystem

__all__ = ["File", "Storage", "MissingFileError", "create_storage"]


def _remove_memory_directory(filesystem: MemoryFileSystem, directory: str) -> None:
    """Release only the namespace owned by a collected testing filesystem."""

    if filesystem.exists(directory):
        filesystem.rm(directory, recursive=True)


def create_storage(settings: Envs) -> Storage:
    """Select an async backend with an isolated Solution storage scope."""

    # Validate configured scopes before constructing a backend.
    bucket = PurePosixPath(settings.STORAGE_BUCKET) if settings.STORAGE_BUCKET else None
    prefix = PurePosixPath(settings.STORAGE_PREFIX) if settings.STORAGE_PREFIX else None
    if bucket is not None and (
        bucket.is_absolute() or len(bucket.parts) != 1 or ".." in bucket.parts or "\\" in str(bucket) or "\x00" in str(bucket)
    ):
        raise ValueError("Storage buckets must be bucket names")
    if prefix is not None and (
        prefix.is_absolute() or not prefix.parts or ".." in prefix.parts or "\\" in str(prefix) or "\x00" in str(prefix)
    ):
        raise ValueError("Storage prefixes must be relative paths inside a bucket")
    if prefix is not None and bucket is None:
        raise ValueError("Storage prefixes require a bucket")

    # Scope all backends with fsspec while keeping production network I/O native async.
    scope = bucket
    if scope is not None and prefix is not None:
        scope /= prefix
    if settings.ENV == "production":
        backend = fsspec.filesystem(
            "s3",
            asynchronous=True,
            endpoint_url=settings.STORAGE_ENDPOINT_URL,
            key=settings.STORAGE_USERNAME,
            secret=settings.STORAGE_PASSWORD,
            client_kwargs={"region_name": settings.STORAGE_REGION},
            config_kwargs={"s3": {"addressing_style": "path"}, "http_session_cls": tls.Session},
            skip_instance_cache=True,
        )
        filesystem = DirFileSystem(path=scope.as_posix() if scope else "", fs=backend, asynchronous=True, skip_instance_cache=True)
        return Filesystem(filesystem, certificate=settings.STORAGE_CERTIFICATE)

    # fsspec's memory store is global, so give every testing filesystem its own namespace.
    if settings.ENV == "testing":
        backend = MemoryFileSystem(skip_instance_cache=True)
        directory = f"/longlink-testing-{uuid4()}"
        backend.mkdir(directory)
        root = PurePosixPath(directory)
        if scope is not None:
            root /= scope
        filesystem = DirFileSystem(path=root.as_posix(), fs=backend, skip_instance_cache=True)
        weakref.finalize(filesystem, _remove_memory_directory, backend, directory)
        return Filesystem(filesystem)

    # Mirror the production bucket and prefix beneath the development directory.
    root = Path.cwd() / ".storage"
    if scope is not None:
        root /= scope
    backend = fsspec.filesystem("file", auto_mkdir=True, skip_instance_cache=True)
    filesystem = DirFileSystem(path=root.resolve().as_posix(), fs=backend, skip_instance_cache=True)
    return Filesystem(filesystem)
