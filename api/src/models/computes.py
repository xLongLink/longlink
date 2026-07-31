import json
import yaml
from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.types import PlatformVersion
from src.models.statuses import Status


def kubeconfig_mapping(value: object) -> dict[str, object]:
    """Parse one YAML or mapping kubeconfig into a JSON-compatible mapping."""

    # Parse user-supplied YAML only at the API boundary.
    if isinstance(value, str):
        try:
            value = yaml.safe_load(value)
        except yaml.YAMLError as exc:
            raise ValueError("Kubernetes kubeconfig must be valid YAML") from exc

    # Persist only object-shaped Kubernetes configurations.
    if not isinstance(value, dict):
        raise ValueError("Kubernetes kubeconfig must be a mapping")

    # Canonicalize values so the database JSON column never receives YAML-only types or non-string keys.
    try:
        normalized = json.loads(json.dumps(value))
    except (TypeError, ValueError) as exc:
        raise ValueError("Kubernetes kubeconfig must be JSON-compatible") from exc
    if not isinstance(normalized, dict):
        raise ValueError("Kubernetes kubeconfig must be a mapping")
    return normalized


class ComputeRegistryCreate(BaseModel):
    """Validate one compute registry creation payload."""

    # Metadata
    name: str = Field(min_length=1, max_length=128)

    # Connection
    kubeconfig: dict[str, object]

    @field_validator("kubeconfig", mode="before")
    @classmethod
    def validate_kubeconfig(cls, value: object) -> dict[str, object]:
        """Parse and validate kubeconfigs before persistence."""

        return kubeconfig_mapping(value)


class ComputeRegistryResponse(BaseModel):
    """Describe one compute backend without exposing its private connection state or secrets."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str

    # Gateway
    gateway_url: str | None

    # State
    status: Status
    version: PlatformVersion
