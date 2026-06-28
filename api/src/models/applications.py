from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from src.models.roles import ApplicationRoles
from src.models.users import UserSummary
from src.models.statuses import ApplicationStatus
from src.models.organizations import OrganizationSummary


class ApplicationCreate(BaseModel):
    """Validate application creation payloads."""

    # Metadata
    name: str
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
    version: str | None = None
    sdk_version: str | None = None
    description: str | None = None

    # State
    role: ApplicationRoles | None = None
    status: ApplicationStatus

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None
