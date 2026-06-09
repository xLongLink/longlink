from typing import Annotated
from datetime import datetime
from pydantic import BaseModel, BeforeValidator, ConfigDict, field_validator
from src.models.roles import Roles
from src.models.users import UserSummary


def normalize_app_name(value: str) -> str:
    """Trim whitespace and lowercase app names."""

    return value.strip().lower()


AppName = Annotated[str, BeforeValidator(normalize_app_name)]


class AppCreate(BaseModel):
    name: AppName
    image: str
    description: str | None = None
    icon: str | None = None

    @field_validator("image", mode="before")
    @classmethod
    def normalize_image(cls, value: str) -> str:
        """Normalize image reference by trimming outer whitespace."""
        return value.strip()

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        """Normalize the optional app description by trimming outer whitespace."""

        return value.strip() if value is not None else None


class AppResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None = None
    icon: str | None = None
    role: Roles | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
