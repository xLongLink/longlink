from pydantic import Field, BaseModel


class StorageConnectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    endpoint_url: str = Field(min_length=1, max_length=512)
    access_key_id: str = Field(min_length=1, max_length=255)
    secret_access_key: str = Field(min_length=1, max_length=255)
    region_name: str | None = Field(default=None, max_length=64)


class StorageConnectionDelete(BaseModel):
    name: str = Field(min_length=1, max_length=128)


class StorageConnectionResponse(BaseModel):
    name: str
    endpoint_url: str
    access_key_id: str
    region_name: str | None = None


class StorageBucketCreateResponse(BaseModel):
    app_id: str
    app_key: str
    bucket: str
    connection_name: str
    status: str = 'created'
