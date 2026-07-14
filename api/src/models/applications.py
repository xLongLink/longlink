import re
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.utils import images
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.models.users import UserSummary
from src.models.statuses import ApplicationStatus
from longlink.models.icons import Icon
from src.models.organizations import OrganizationSummary

APPLICATION_ENVIRONMENT_COUNT_MAX = 100
APPLICATION_ENVIRONMENT_NAME_MAX_LENGTH = 253
APPLICATION_ENVIRONMENT_VALUE_MAX_LENGTH = 32768
APPLICATION_ENVIRONMENT_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class ApplicationCreate(BaseModel):
    """Validate application creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=100)
    icon: Icon | None = None
    image: str
    description: str | None = Field(default=None, max_length=255)

    # Relationships
    envs: dict[str, str] = Field(default_factory=dict)

    @field_validator("image")
    @classmethod
    def validate_image(cls, image: str) -> str:
        """Validate the application container image reference."""

        return images.parse_reference(image).value

    @field_validator("envs")
    @classmethod
    def validate_environment_variables(cls, envs: dict[str, str]) -> dict[str, str]:
        """Validate application environment names and bounded value sizes."""

        # Limit the number of environment values accepted per application.
        if len(envs) > APPLICATION_ENVIRONMENT_COUNT_MAX:
            raise ValueError(f"Application environment variables must be at most {APPLICATION_ENVIRONMENT_COUNT_MAX}")

        # Validate each environment name and value independently.
        for name, value in envs.items():

            # Bound environment variable names to the supported label size.
            if len(name) > APPLICATION_ENVIRONMENT_NAME_MAX_LENGTH:
                raise ValueError(f"Environment variable '{name}' is too long")

            # Environment names must be shell-compatible identifiers.
            if not APPLICATION_ENVIRONMENT_NAME_PATTERN.fullmatch(name):
                raise ValueError(f"Environment variable '{name}' is invalid")

            # Bound environment values to avoid oversized runtime secrets.
            if len(value) > APPLICATION_ENVIRONMENT_VALUE_MAX_LENGTH:
                raise ValueError(f"Environment variable '{name}' value is too long")

        return envs


class ApplicationResponse(BaseModel):
    """Represent one application in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Relationships
    organization: OrganizationSummary
    organization_id: UUID

    # Metadata
    sdk: str | None = None
    name: str
    slug: str
    icon: Icon | None = None
    image: str
    digest: str | None = None
    version: str | None = None
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
    avatar: str = ""

    # State
    application_role: ApplicationRoles | None = None
    organization_role: OrganizationRoles
