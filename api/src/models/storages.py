from pydantic import BaseModel


class StorageBucketCreateResponse(BaseModel):
    app_id: str
    app_key: str
    bucket: str
    status: str = 'created'
