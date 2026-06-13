from enum import Enum
from typing import Annotated
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, BeforeValidator
from src.models.organization_summary import OrganizationSummary
from src.models.roles import Roles
from src.models.users import UserSummary


def normalize_application_name(value: str) -> str:
    """Lowercase application names."""

    return value.lower()


ApplicationName = Annotated[str, BeforeValidator(normalize_application_name)]


class AppStatus(str, Enum):
    """Lifecycle states for installed applications."""

    creating = "creating"
    running = "running"
    deleting = "deleting"
    failed = "failed"


class ApplicationCreate(BaseModel):
    name: ApplicationName
    image: str
    description: str | None = None
    icon: str | None = None
    envs: dict[str, str] = Field(default_factory=dict)


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    organization: OrganizationSummary
    name: str
    slug: str
    image: str
    status: AppStatus
    description: str | None = None
    icon: str | None = None
    role: Roles | None = None
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
