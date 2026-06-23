from enum import Enum
from uuid import UUID
from typing import Annotated
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, BeforeValidator
from src.models.roles import ApplicationRoles
from src.models.users import UserSummary
from src.models.organization_summary import OrganizationSummary


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
    """Validate application creation payloads."""

    # Metadata
    name: ApplicationName
    icon: str | None = None
    image: str
    description: str | None = None

    # Relationships
    envs: dict[str, str] = Field(default_factory=dict)


class ApplicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Relationships
    organization: OrganizationSummary
    organization_id: UUID

    # Metadata
    name: str
    slug: str
    icon: str | None = None
    image: str
    description: str | None = None

    # State
    role: ApplicationRoles | None = None
    status: AppStatus

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
