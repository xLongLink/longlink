import json
import yaml
from uuid import UUID
from typing import Annotated, cast
from pydantic import Field, HttpUrl, BaseModel, ConfigDict, ValidationInfo, BeforeValidator, field_validator
from urllib.parse import urlsplit

HTTPS_PORT = 443


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
        value = cast(dict[str, object], json.loads(json.dumps(value)))
    except TypeError as exc:
        raise ValueError("Kubernetes kubeconfig must be JSON-compatible") from exc

    # Require a selected context with resolvable cluster and user entries before persisting the connection.
    clusters = value.get("clusters")
    contexts = value.get("contexts")
    users = value.get("users")
    current_context = value.get("current-context")
    if (
        not isinstance(clusters, list)
        or not isinstance(contexts, list)
        or not isinstance(users, list)
        or not isinstance(current_context, str)
    ):
        raise ValueError("Kubernetes kubeconfig requires clusters, contexts, users, and current-context")

    cluster_names = {
        entry.get("name")
        for entry in clusters
        if isinstance(entry, dict) and isinstance(entry.get("name"), str) and isinstance(entry.get("cluster"), dict)
    }
    user_names = {
        entry.get("name")
        for entry in users
        if isinstance(entry, dict) and isinstance(entry.get("name"), str) and isinstance(entry.get("user"), dict)
    }
    selected_context: dict[str, object] | None = None
    for entry in contexts:
        if not isinstance(entry, dict) or entry.get("name") != current_context:
            continue
        context = entry.get("context")
        if isinstance(context, dict):
            selected_context = cast(dict[str, object], context)
            break
    if (
        not cluster_names
        or not user_names
        or selected_context is None
        or selected_context.get("cluster") not in cluster_names
        or selected_context.get("user") not in user_names
    ):
        raise ValueError("Kubernetes kubeconfig current-context must reference a configured cluster and user")

    # Kubeconfig exec authentication runs administrator-supplied commands in the API worker.
    for entry in users:
        if not isinstance(entry, dict):
            continue
        user = entry.get("user")
        if isinstance(user, dict) and "exec" in user:
            raise ValueError("Kubernetes kubeconfig exec authentication is not allowed")

    return value


class ComputeRegistryCreate(BaseModel):
    """Validate one compute registry creation payload."""

    # External endpoints
    gateway_url: str = Field(max_length=512)
    storage_endpoint: str = Field(max_length=512)

    @field_validator("gateway_url", "storage_endpoint")
    @classmethod
    def validate_endpoint(cls, value: str, info: ValidationInfo) -> str:
        """Normalize and validate one credential-free HTTPS endpoint origin."""

        # Supply HTTPS when an administrator enters only a host and optional port.
        if "://" not in value:
            value = f"https://{value}"

        # Preserve explicit ports and select standard HTTPS when it is omitted.
        source = urlsplit(value)
        port = source.port if source.port is not None else HTTPS_PORT

        # Keep proxy paths separate from the registered TLS endpoint.
        url = HttpUrl(value)
        if (
            url.scheme != "https"
            or url.username is not None
            or url.password is not None
            or url.path not in (None, "/")
            or url.query is not None
            or url.fragment is not None
        ):
            raise ValueError("Endpoint must be an HTTPS origin without credentials, path, query, or fragment")
        return f"https://{url.host}:{port}"

    # Metadata
    name: str = Field(min_length=1, max_length=128)

    # Connection
    kubeconfig: Annotated[dict[str, object], BeforeValidator(kubeconfig_mapping)]


class ComputeRegistryResponse(BaseModel):
    """Describe one compute backend without exposing its private connection state or secrets."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str

    # Gateway
    gateway_url: str

    # Database
    database_storage_class: str

    # Object storage
    storage_endpoint: str
