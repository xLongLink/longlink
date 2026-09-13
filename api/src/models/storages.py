from pydantic import Field, BaseModel


class OrganizationStorageUsageResponse(BaseModel):
    """Report current logical object bytes for one organization bucket."""

    space_used: int = Field(ge=0)
