from typing import Any, cast
from fsspec.spec import AbstractFileSystem
from longlink.utils.settings import Envs


class Storage(AbstractFileSystem):
    """Small wrapper for fsspec filesystem instances."""

    def __init__(self, **kwargs: Any) -> None:
        initializer = cast(Any, super().__init__)
        initializer(**kwargs)



def create_fs(env: Envs) -> Storage:
    """Create a filesystem for the active environment."""

    if env.ENV == "testing":
        return Storage(protocol="memory")

    if env.ENV == "production":
        return Storage(
            protocol=env.STORAGE_PROTOCOL,
            endpoint_url=env.STORAGE_ENDPOINT_URL,
            key=env.STORAGE_ACCESS_KEY_ID,
            secret=env.STORAGE_SECRET_ACCESS_KEY,
        )

    return Storage(protocol=env.STORAGE_PROTOCOL)
