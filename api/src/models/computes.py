from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict
from src.models.statuses import Status
from src.models.operations import OperationResponse


class ComputeRegistryCreate(BaseModel):
    """Validate one compute registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)

    # Connection
    kubeconfig: str = Field(min_length=1, max_length=1024 * 1024)


class ComputeRegistryResponse(BaseModel):
    """Describe one compute backend without exposing its connection state or secrets."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str

    # State
    status: Status
    version: str | None


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
