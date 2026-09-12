import ssl
import json
import yaml
from uuid import UUID
from typing import Literal, Annotated, cast
from pydantic import Field, HttpUrl, BaseModel, ConfigDict, BeforeValidator, field_validator
from src.models.statuses import Status

# Both backing storage classes use the same Kubernetes DNS-name constraints.
StorageClassName = Annotated[
    str,
    Field(min_length=1, max_length=253, pattern=r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$"),
]


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

    # Metadata
    name: str = Field(min_length=1, max_length=128)

    # Connection
    kubeconfig: Annotated[dict[str, object], BeforeValidator(kubeconfig_mapping)]

    # Gateway
    gateway_url: str = Field(max_length=512)
    gateway_certificate: str | None = Field(default=None, max_length=65536)

    # Database
    database_size_gib: int = Field(default=10, ge=1, le=65536, strict=True)
    database_instances: int = Field(default=1, ge=1, le=3, strict=True)
    database_storage_class: StorageClassName

    # Object storage
    storage_class: StorageClassName
    storage_endpoint: str = Field(max_length=512)
    storage_size_gib: int = Field(default=100, ge=10, le=65536, strict=True)
    storage_instances: Literal[1, 3] = 3
    storage_certificate: str | None = Field(default=None, max_length=65536)

    # Storage admission policy (explicit administrator configuration)
    bucket_size_bytes: int = Field(ge=1024, le=70368744177664, multiple_of=1024, strict=True)
    bucket_max_objects: int = Field(ge=1, le=2147483647, strict=True)
    storage_reserve_percent: int = Field(ge=1, le=99, strict=True)
    storage_object_overhead_bytes: int = Field(ge=4096, le=1073741824, strict=True)

    @field_validator("gateway_url", "storage_endpoint")
    @classmethod
    def validate_gateway_url(cls, value: str) -> str:
        """Require a credential-free HTTPS gateway origin."""

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
            raise ValueError("Gateway URL must be an HTTPS origin without credentials, path, query, or fragment")
        return str(url).rstrip("/")

    @field_validator("gateway_certificate", "storage_certificate")
    @classmethod
    def validate_gateway_certificate(cls, value: str | None) -> str | None:
        """Validate an optional PEM trust bundle without accepting private keys."""

        # Let the TLS library validate the same certificate data used by the proxy.
        if value is None:
            return None
        if "PRIVATE KEY" in value or "-----BEGIN CERTIFICATE-----" not in value:
            raise ValueError("Gateway certificate must be a PEM CA certificate bundle")
        try:
            ssl.create_default_context(cadata=value)
        except ssl.SSLError as exc:
            raise ValueError("Gateway certificate must be a valid PEM CA certificate bundle") from exc
        return value

    @field_validator("database_storage_class", "storage_class")
    @classmethod
    def validate_storage_class(cls, value: str) -> str:
        """Require DNS labels within the Kubernetes storage class name."""

        # Kubernetes DNS subdomain labels are limited to 63 characters each.
        if any(len(label) > 63 for label in value.split(".")):
            raise ValueError("Storage class DNS labels must not exceed 63 characters")
        return value


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
    database_size_gib: int
    database_instances: int
    database_storage_class: str

    # Object storage
    storage_class: str
    storage_endpoint: str
    storage_size_gib: int
    storage_instances: int

    # Storage admission policy
    bucket_size_bytes: int
    bucket_max_objects: int
    storage_reserve_percent: int
    storage_object_overhead_bytes: int

    # State
    status: Status
