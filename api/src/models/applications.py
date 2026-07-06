from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.icons import Icon, parse_icon
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.models.users import Avatar, UserSummary
from src.models.statuses import ApplicationStatus
from src.models.organizations import OrganizationSummary


class ApplicationCreate(BaseModel):
    """Validate application creation payloads."""

    # Metadata
    name: str
    icon: Icon | None = None
    image: str
    description: str | None = None

    # Relationships
    envs: dict[str, str] = Field(default_factory=dict)

    @field_validator("icon", mode="before")
    @classmethod
    def validate_icon(cls, icon: str | Icon | None) -> Icon | None:
        """Normalize and validate application icon slugs."""

        return parse_icon(icon)


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
    icon: Icon | None = None
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

    @field_validator("icon", mode="before")
    @classmethod
    def validate_icon(cls, icon: str | Icon | None) -> Icon | None:
        """Normalize and validate persisted application icon slugs."""

        return parse_icon(icon)


class ApplicationMemberUpdate(BaseModel):
    """Validate application member role updates."""

    # State
    role: ApplicationRoles | None = None


class ApplicationMemberResponse(BaseModel):
    """Represent one organization member's application access."""

    # Identifier
    id: UUID

    # Metadata
    name: str
    email: str
    avatar: Avatar = ""

    # State
    application_role: ApplicationRoles | None = None
    organization_role: OrganizationRoles
