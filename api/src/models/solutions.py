import re
from uuid import UUID
from typing import Annotated
from datetime import datetime
from pydantic import Field, BaseModel, AfterValidator, field_validator
from src.models.types import Image, MinScale
from src.models.metadata import LongLinkMetadata
from src.models.resources import OrganizationIdentity, OrganizationSolutionSummary


def validate_idle_seconds(value: int) -> int:
    """Allow never-sleep zero or a bounded scale-to-zero timeout."""

    if value != 0 and value < 30:
        raise ValueError("idle_seconds must be 0 or between 30 and 3600")
    return value


# Share request-model bounds and policy while keeping service validation independent.
IdleSeconds = Annotated[int, Field(ge=0, le=3600), AfterValidator(validate_idle_seconds)]


def validate_environment_variables(envs: dict[str, str]) -> dict[str, str]:
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


class SolutionCreate(BaseModel):
    """Validate solution creation metadata and release configuration."""

    envs: Annotated[dict[str, str], AfterValidator(validate_environment_variables)] = Field(default_factory=dict)
    image: Image
    name: str = Field(min_length=1, max_length=100)
    min_scale: MinScale = 0
    idle_seconds: IdleSeconds = 60
    description: str | None = Field(default=None, max_length=255)


class SolutionPatch(BaseModel):
    """Preserve omitted values and remove variables explicitly set to null."""

    envs: dict[str, str | None] = Field(default_factory=dict)
    min_scale: MinScale | None = None
    idle_seconds: IdleSeconds | None = None
    expected_revision_id: UUID | None = None

    @field_validator("envs")
    @classmethod
    def validate_patch(cls, envs: dict[str, str | None]) -> dict[str, str | None]:
        """Validate names and supplied values, including removal names."""

        validate_environment_variables({name: value or "" for name, value in envs.items()})
        return envs


class SolutionUpdateCheck(BaseModel):
    """Expose a candidate and configured names, never environment values."""

    # Configuration
    min_scale: MinScale
    idle_seconds: int

    # Current release
    revision_id: UUID
    current_image: str = Field(description="Immutable image of the desired revision used for this update check.")
    current_version: str | None = Field(default=None, description="OCI version label of the desired image, when available.")
    configured_envs: list[str]

    # Candidate
    metadata: LongLinkMetadata


class SolutionResponse(OrganizationSolutionSummary):
    """Represent one solution in API responses."""

    # Relationships
    organization: OrganizationIdentity

    # Metadata
    description: str | None = Field(...)

    # Desired release
    image_desired: str
    deployed_revision_id: UUID | None

    # Audit
    created_at: datetime
