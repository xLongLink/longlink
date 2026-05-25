from pydantic import Field, BaseModel, field_validator


class OrgCreate(BaseModel):
    """Validate org creation payloads."""

    name: str = Field(min_length=1, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        """Trim whitespace from org names."""
        return value.strip()


class OrgResponse(BaseModel):
    """Expose the org name in API responses."""

    name: str
