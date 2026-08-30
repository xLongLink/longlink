import json
import yaml
from uuid import UUID
from pydantic import Field, BaseModel, ConfigDict, field_validator
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

    # Kubeconfig exec authentication runs administrator-supplied commands in the API worker.
    users = value.get("users")
    if isinstance(users, list):
        for entry in users:
            if not isinstance(entry, dict):
                continue
            user = entry.get("user")
            if isinstance(user, dict) and "exec" in user:
                raise ValueError("Kubernetes kubeconfig exec authentication is not allowed")

    # Canonicalize values so the database JSON column never receives YAML-only types or non-string keys.
    try:
        return json.loads(json.dumps(value))
    except TypeError as exc:
        raise ValueError("Kubernetes kubeconfig must be JSON-compatible") from exc


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
