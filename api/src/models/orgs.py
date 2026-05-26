from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from src.models.users import UserSummary


class OrgCreate(BaseModel):
    """Validate org creation payloads."""

    name: str = Field(min_length=1, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        """Trim whitespace from org names."""
        return value.strip()


class OrgAppResponse(BaseModel):
    """Represent one application in an organization payload."""

    id: int
    name: str
    url: str
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary


class OrgDetails(BaseModel):
    """Represent an organization with its members."""

    name: str
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary
    users: list[UserSummary]
    apps: list[OrgAppResponse] = Field(default_factory=list)
