import fsspec
from fsspec.spec import AbstractFileSystem
from urllib.parse import unquote, urlsplit, urlunsplit
from longlink.utils.settings import Envs
from fsspec.implementations.dirfs import DirFileSystem


def create_fs(env: Envs) -> AbstractFileSystem:
    """Create the application-scoped filesystem for the active environment."""

    return _create_scoped_fs(env, env.STORAGE_BUCKET)


def create_shared_fs(env: Envs) -> AbstractFileSystem:
    """Create the shared organization filesystem for the active environment."""

    return _create_scoped_fs(env, env.STORAGE_SHARED_BUCKET)


def _create_scoped_fs(env: Envs, bucket: str | None) -> AbstractFileSystem:
    """Create a filesystem, optionally scoped to one bucket path."""

    if env.ENV == "testing":
        filesystem = fsspec.filesystem("memory")
        if bucket:
            return DirFileSystem(path=bucket, fs=filesystem)

        return filesystem

    if env.ENV == "development":
        filesystem = fsspec.filesystem("file")
        if bucket:
            return DirFileSystem(path=bucket, fs=filesystem)

        return filesystem

    storage_url = urlsplit(env.STORAGE_URL)
    protocol_parts = storage_url.scheme.split("+", 1)
    if len(protocol_parts) == 1:
        filesystem = fsspec.filesystem(protocol_parts[0])

        if bucket:
            return DirFileSystem(path=bucket, fs=filesystem)

        return filesystem

    # LongLink stores endpoint transport in the URL scheme suffix, for example s3+https://...
    storage_protocol, endpoint_protocol = protocol_parts
    endpoint_netloc = storage_url.netloc.rsplit("@", 1)[-1]
    endpoint_url = urlunsplit(
        (endpoint_protocol, endpoint_netloc, storage_url.path, storage_url.query, storage_url.fragment)
    )

    filesystem = fsspec.filesystem(
        storage_protocol,
        endpoint_url=endpoint_url,
        key=unquote(storage_url.username or ""),
        secret=unquote(storage_url.password or ""),
    )

    if bucket:
        # Runtime applications should work with keys inside the selected bucket only.
        return DirFileSystem(path=bucket, fs=filesystem)

    return filesystem
