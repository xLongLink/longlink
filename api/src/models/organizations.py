from pydantic import Field, BaseModel, field_validator


class OrganizationCreate(BaseModel):
    """Validate organization creation payloads."""

    name: str = Field(min_length=1, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        """Trim whitespace from organization names."""
        return value.strip()


class OrganizationResponse(BaseModel):
    """Expose the organization name in API responses."""

    name: str
