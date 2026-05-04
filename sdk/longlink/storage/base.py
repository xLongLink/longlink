from fsspec.spec import AbstractFileSystem
from longlink.utils.settings import Environments


class Storage(AbstractFileSystem):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)



def create_fs(env: Environments):
    if env.ENV == "testing":
        return Storage("memory")

    if env.ENV == "production":
        return Storage(
            endpoint_url=env.STORAGE_ENDPOINT_URL,
            key=env.STORAGE_ACCESS_KEY_ID,
            secret=env.STORAGE_SECRET_ACCESS_KEY,
        )

    return Storage("file")