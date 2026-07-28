import yaml
from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.statuses import Status


class ComputeRegistryCreate(BaseModel):
    """Validate one compute registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)

    # Connection
    kubeconfig: str = Field(min_length=1, max_length=1024 * 1024)

    @field_validator("kubeconfig")
    @classmethod
    def validate_kubeconfig(cls, value: str) -> str:
        """Reject kubeconfigs that are not YAML mappings before persistence."""

        # Parse the user-controlled document at the API boundary.
        try:
            kubeconfig = yaml.safe_load(value)
        except yaml.YAMLError as exc:
            raise ValueError("Kubernetes kubeconfig must be valid YAML") from exc
        if not isinstance(kubeconfig, dict):
            raise ValueError("Kubernetes kubeconfig must be a mapping")
        return value


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


class PodResponse(BaseModel):
    """Represent a pod in a namespace."""

    # Metadata
    name: str
    node: str | None

    # State
    status: str
