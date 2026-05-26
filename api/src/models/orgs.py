from pydantic import BaseModel, Field, field_validator

from src.models.roles import RoleName
from src.models.users import Accent, Language, Radius, Theme


class OrgCreate(BaseModel):
    """Validate org creation payloads."""

    name: str = Field(min_length=1, max_length=128)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        """Trim whitespace from org names."""
        return value.strip()


class OrgMemberResponse(BaseModel):
    """Represent one organization member in API responses."""

    id: int | None
    name: str
    email: str
    avatar: str | None = None
    theme: Theme
    accent: Accent
    radius: Radius
    language: Language
    oidc_subject: str | None = None
    role: RoleName | None = None


class OrgDetails(BaseModel):
    """Represent an organization with its members."""

    name: str
    users: list[OrgMemberResponse]
