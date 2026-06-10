from typing import Annotated
from datetime import datetime
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field
from src.models.roles import Roles
from src.models.users import UserSummary


def normalize_app_name(value: str) -> str:
    """Lowercase app names."""

    return value.lower()


AppName = Annotated[str, BeforeValidator(normalize_app_name)]


class AppCreate(BaseModel):
    name: AppName
    image: str
    description: str | None = None
    icon: str | None = None
    envs: dict[str, str] = Field(default_factory=dict)


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
