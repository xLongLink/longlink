from fsspec.spec import AbstractFileSystem
from longlink.utils.settings import env


class Storage(AbstractFileSystem):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)


fs = Storage(env.STORAGE_PROTOCOL, endpoint_url=env.STORAGE_ENDPOINT_URL, key=env.STORAGE_ACCESS_KEY_ID, secret=env.STORAGE_SECRET_ACCESS_KEY)


def get_fs() -> AbstractFileSystem:
    """Return the configured filesystem instance."""

    return fs
