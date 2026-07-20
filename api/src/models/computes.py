from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict
from src.models.users import UserSummary
from src.models.statuses import ComputeStatus
from src.models.operations import OperationResponse


class ComputeRegistryCreate(BaseModel):
    """Validate one compute registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)

    # Connection
    kubeconfig: str = Field(min_length=1, max_length=1024 * 1024)


class ComputeRegistryResponse(BaseModel):
    """Describe one compute backend without exposing its kubeconfig or gateway secrets.

    The gateway URL is non-secret connection state observed during reconciliation.
    """

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    gateway_url: str | None

    # State
    status: ComputeStatus
    version: str | None

    # Audit
    created_at: datetime
    created_by: UserSummary
    updated_at: datetime
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class ComputeRegistryMutationResponse(BaseModel):
    """Pair an accepted compute change with its reconciliation operation."""

    # Result
    compute: ComputeRegistryResponse
    operation: OperationResponse


class PodResponse(BaseModel):
    """Represent a pod in a namespace."""

    # Metadata
    name: str
    node: str | None = None

    # State
    status: str
