from pydantic import BaseModel


class StorageUsageSummary(BaseModel):
    used_bytes: int | None = None
    free_bytes: int | None = None
    bucket_count: int = 0


class StorageConfigSummary(BaseModel):
    endpoint_url: str
    access_key_id: str
    region_name: str | None = None


class StorageSummaryResponse(BaseModel):
    configured: bool
    config: StorageConfigSummary | None = None
    usage: StorageUsageSummary = StorageUsageSummary()


class StorageBucketCreateResponse(BaseModel):
    app_id: str
    app_key: str
    bucket: str
    status: str = 'created'
