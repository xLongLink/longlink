import re
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.types import Image
from src.models.statuses import Status
from src.models.resources import OrganizationIdentity


class ApplicationCreate(BaseModel):
    """Validate application creation payloads."""

    # Metadata
    name: str = Field(min_length=1, max_length=100)
    image: Image
    description: str | None = Field(default=None, max_length=255)

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
            if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
                raise ValueError(f"Environment variable '{name}' is invalid")

            # Reserve Platform-managed runtime variables for reconciliation.
            if name.startswith("LONGLINK_"):
                raise ValueError(f"Environment variable '{name}' is reserved for the LongLink Platform")

            # Bound environment values to avoid oversized runtime secrets.
            if len(value) > 32768:
                raise ValueError(f"Environment variable '{name}' value is too long")

        # Leave room for base64 expansion and Kubernetes Secret metadata.
        if sum(len(name.encode("utf-8")) + len(value.encode("utf-8")) for name, value in envs.items()) > 512 * 1024:
            raise ValueError("Application environment is too large")

        return envs


class ApplicationResponse(BaseModel):
    """Represent one application in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Relationships
    organization: OrganizationIdentity

    # Metadata
    name: str
    slug: str
    description: str | None

    # Desired release
    image_desired: str

    # State
    status: Status

    # Audit
    created_at: datetime
