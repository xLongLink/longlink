import re
from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
from src.models.resources import OrganizationIdentity


class EnvironmentValues(BaseModel):
    """Validate a complete environment snapshot."""

    # Configuration
    envs: dict[str, str] = Field(default_factory=dict)

    @field_validator("envs")
    @classmethod
    def validate_environment_variables(cls, envs: dict[str, str]) -> dict[str, str]:
        """Validate solution environment names, ownership, and bounded value sizes."""

        # Limit the number of environment values accepted per solution.
        if len(envs) > 100:
            raise ValueError("Solution environment contains too many variables")

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
            raise ValueError("Solution environment is too large")

        return envs


class SolutionCreate(EnvironmentValues):
    """Validate solution creation metadata and release configuration."""

    image: Image
    name: str = Field(min_length=1, max_length=100)
    min_scale: Literal[0, 1] = 0
    description: str | None = Field(default=None, max_length=255)


class SolutionPatch(BaseModel):
    """Preserve omitted values and remove variables explicitly set to null."""

    envs: dict[str, str | None] = Field(default_factory=dict)
    min_scale: Literal[0, 1] | None = None
    expected_revision_id: UUID | None = None

    @field_validator("envs")
    @classmethod
    def validate_patch(cls, envs: dict[str, str | None]) -> dict[str, str | None]:
        """Validate names and supplied values, including removal names."""

        EnvironmentValues.validate_environment_variables({name: value or "" for name, value in envs.items()})
        return envs


class SolutionUpdate(SolutionPatch):
    """Deploy a submitted image source with an environment patch."""

    image: Image


class SolutionUpdateCheck(BaseModel):
    """Expose a candidate and configured names, never environment values."""

    min_scale: Literal[0, 1]
    revision_id: UUID
    current_image: str = Field(description="Immutable image of the desired revision used for this update check.")
    configured_envs: list[str]
    metadata: LongLinkMetadata


class RevisionResponse(BaseModel):
    """Expose release history without encrypted environment values."""

    model_config = ConfigDict(from_attributes=True)
    id: UUID
    image: str
    source: str
    configured_envs: list[str]
    min_scale: Literal[0, 1]
    failed: bool
    created_at: datetime
    created_id: UUID | None
    deployed_at: datetime | None


class SolutionResponse(BaseModel):
    """Represent one solution in API responses."""

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
    min_scale: Literal[0, 1]
    image_desired: str
    desired_revision_id: UUID | None
    deployed_revision_id: UUID | None

    # State
    status: Status
    deployment_pending: bool

    # Audit
    created_at: datetime
