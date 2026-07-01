import fsspec
from urllib.parse import unquote, urlsplit, urlunsplit
from fsspec.spec import AbstractFileSystem
from longlink.utils.settings import Envs


def create_fs(env: Envs) -> AbstractFileSystem:
    """Create a filesystem for the active environment."""

    if env.ENV == "testing":
        return fsspec.filesystem("memory")

    if env.ENV == "development":
        return fsspec.filesystem("file")

    storage_url = urlsplit(env.STORAGE_URL)
    protocol_parts = storage_url.scheme.split("+", 1)
    if len(protocol_parts) == 1:
        return fsspec.filesystem(protocol_parts[0])

    # LongLink stores endpoint transport in the URL scheme suffix, for example s3+https://...
    storage_protocol, endpoint_protocol = protocol_parts
    endpoint_netloc = storage_url.netloc.rsplit("@", 1)[-1]
    endpoint_url = urlunsplit(
        (endpoint_protocol, endpoint_netloc, storage_url.path, storage_url.query, storage_url.fragment)
    )

    return fsspec.filesystem(
        storage_protocol,
        endpoint_url=endpoint_url,
        key=unquote(storage_url.username or ""),
        secret=unquote(storage_url.password or ""),
    )
