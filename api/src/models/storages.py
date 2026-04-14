from pydantic import BaseModel


class StorageConnection(BaseModel):
    name: str
    endpoint_url: str
    region_name: str | None = None


class StorageBucketCreateResponse(BaseModel):
    app_id: str
    app_key: str
    bucket: str
    status: str = 'created'
