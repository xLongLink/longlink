from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.statuses import Status


class OrganizationIdentity(BaseModel):
    """Represent a compact Organization in nested API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str

    # State
    status: Status


class OrganizationSolutionSummary(BaseModel):
    """Represent a compact LongLink Solution in nested Organization responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    description: str | None = None

    # Categories
    tag_ids: list[UUID] = Field(default_factory=list)

    # State
    status: Status
    deployment_pending: bool
    desired_revision_id: UUID | None

    # Deployed release
    deployed_version: str | None = Field(
        default=None, description="Recorded image version of the last successfully deployed revision, when available."
    )
