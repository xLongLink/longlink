import re
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.icons import Icon, parse_icon
from src.utils.images import validate_image_reference
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.models.users import Avatar, UserSummary
from src.models.statuses import ApplicationStatus
from src.models.organizations import OrganizationSummary

APPLICATION_ENVIRONMENT_COUNT_MAX = 100
APPLICATION_ENVIRONMENT_NAME_MAX_LENGTH = 253
APPLICATION_ENVIRONMENT_VALUE_MAX_LENGTH = 32768
APPLICATION_ENVIRONMENT_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


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

    @field_validator("image")
    @classmethod
    def validate_image(cls, image: str) -> str:
        """Validate the application container image reference."""

        return validate_image_reference(image)

    @field_validator("envs")
    @classmethod
    def validate_environment_variables(cls, envs: dict[str, str]) -> dict[str, str]:
        """Validate application environment names and bounded value sizes."""

        if len(envs) > APPLICATION_ENVIRONMENT_COUNT_MAX:
            raise ValueError(f"Application environment variables must be at most {APPLICATION_ENVIRONMENT_COUNT_MAX}")

        for name, value in envs.items():
            if len(name) > APPLICATION_ENVIRONMENT_NAME_MAX_LENGTH:
                raise ValueError(f"Environment variable '{name}' is too long")

            if not APPLICATION_ENVIRONMENT_NAME_PATTERN.fullmatch(name):
                raise ValueError(f"Environment variable '{name}' is invalid")

            if len(value) > APPLICATION_ENVIRONMENT_VALUE_MAX_LENGTH:
                raise ValueError(f"Environment variable '{name}' value is too long")

        return envs


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
    sdk: str | None = None
    digest: str | None = None
    version: str | None = None
    description: str | None = None
    gateway_url: str | None = None

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
