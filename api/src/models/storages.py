from pydantic import Field, BaseModel


class OrganizationStorageUsageResponse(BaseModel):
    """Report current logical object bytes for one organization bucket."""

    bucket_name: str
    space_used: int = Field(ge=0)
