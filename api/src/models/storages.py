from pydantic import Field, BaseModel


class OrganizationStorageUsageResponse(BaseModel):
    """Report current logical object usage and quota for one Organization bucket."""

    # Measurement
    space_used: int = Field(ge=0)

    # Capacity
    quota_bytes: int = Field(ge=0)
