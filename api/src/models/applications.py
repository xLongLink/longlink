import re
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.models.types import Icon, Image
from src.models.users import UserSummary, UserIdentity
from src.models.statuses import ApplicationStatus
from src.models.operations import OperationResponse
from src.models.organizations import OrganizationSummary


class ApplicationEnvironment(BaseModel):
    """Validate user-owned Application environment values."""

    # Configuration
    envs: dict[str, str] = Field(default_factory=dict)

    @field_validator("envs")
    @classmethod
    def validate_environment_variables(cls, envs: dict[str, str]) -> dict[str, str]:
        """Validate application environment names, ownership, and bounded value sizes."""

        # Limit the number of environment values accepted per application.
        if len(envs) > 100:
            raise ValueError("Application environment contains too many variables")

        # Validate each environment name and value independently.
        for name, value in envs.items():

            # Bound environment variable names to the supported label size.
            if len(name) > 253:
                raise ValueError(f"Environment variable '{name}' is too long")

            # Environment names must be shell-compatible identifiers.
            if not re.fullmatch(r"^[A-Za-z_][A-Za-z0-9_]*$", name):
                raise ValueError(f"Environment variable '{name}' is invalid")

            # Reserve Platform-managed runtime variables for reconciliation.
            if name.startswith("LONGLINK_"):
                raise ValueError(f"Environment variable '{name}' is reserved for the LongLink Platform")

            # Bound environment values to avoid oversized runtime secrets.
            if len(value) > 32768:
                raise ValueError(f"Environment variable '{name}' value is too long")

        # Leave room for base64 expansion, Kubernetes metadata, and Platform-managed runtime values.
        environment_bytes = sum(len(name.encode("utf-8")) + len(value.encode("utf-8")) for name, value in envs.items())
        if environment_bytes > 512 * 1024:
            raise ValueError("Application environment is too large")

        return envs


class ApplicationCreate(ApplicationEnvironment):
    """Validate application creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=100)
    icon: Icon | None = None
    image: Image
    description: str | None = Field(default=None, max_length=255)


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
    status: ApplicationStatus

    # Audit
    created_at: datetime
    updated_at: datetime
    created_by: UserSummary
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class ApplicationMutationResponse(BaseModel):
    """Pair an accepted LongLink Application change with its lifecycle Operation.

    The operation must complete before the desired state is confirmed in the runtime.
    """

    # Result
    application: ApplicationResponse
    operation: OperationResponse


class ApplicationAccessResponse(BaseModel):
    """Represent one LongLink Application and the current user's access role."""

    # Relationships
    application: ApplicationResponse

    # Access
    role: ApplicationRoles | None = None


class ApplicationMemberUpdate(BaseModel):
    """Validate application member role updates."""

    # State
    role: ApplicationRoles | None = None


class ApplicationMemberResponse(BaseModel):
    """Represent one organization member's application access."""

    # Relationships
    user: UserIdentity

    # Access
    application_role: ApplicationRoles | None = None
    organization_role: OrganizationRoles
