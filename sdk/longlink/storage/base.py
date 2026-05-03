import fsspec
from longlink.utils.settings import Settings


def create_storage(env: Settings) -> fsspec.AbstractFileSystem:
    """Create fsspec filesystem client from environment settings."""

    if env.storage_protocol == "file":
        fs = fsspec.filesystem("file")
    else:
        fs = fsspec.filesystem(
            env.storage_protocol,
            key=env.storage_key,
            secret=env.storage_secret,
            client_kwargs={"endpoint_url": env.storage_endpoint},
        )
    return fs
