import re
import urllib.parse
from uuid import UUID
from typing import Self
from pydantic import Field, BaseModel, field_validator, model_validator
from src.models.types import StorageKind


def exoscale_zone(endpoint_url: str) -> str:
    """Validate one Exoscale SOS endpoint and return its zone."""

    # Exoscale SOS endpoints use HTTPS and the documented zone-specific hostname.
    parsed = urllib.parse.urlsplit(endpoint_url)
    host = parsed.hostname or ""
    zone = host.removeprefix("sos-").removesuffix(".exo.io")
    try:
        port = parsed.port
    except ValueError as exc:
        raise ValueError("Exoscale storage endpoint URL port is invalid") from exc
    if (
        parsed.scheme != "https"
        or port is not None
        or parsed.path not in {"", "/"}
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
        or not host.startswith("sos-")
        or not host.endswith(".exo.io")
        or re.fullmatch(r"[a-z]{2}-[a-z0-9]+-[0-9]+", zone) is None
    ):
        raise ValueError("Exoscale storage endpoint URL must use https://sos-{zone}.exo.io")

    return zone


class ComputeConfiguration(BaseModel):
    """Kubernetes connection configuration for one compute registry."""

    # Connection
    kubeconfig: str = Field(min_length=1, max_length=1024 * 1024)


class DatabaseConfiguration(BaseModel):
    """Database connection configuration for one registry."""

    # Connection
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    password: str = Field(min_length=1, max_length=255)
    username: str = Field(min_length=1, max_length=255)

    @field_validator("host")
    @classmethod
    def validate_host(cls, host: str) -> str:
        """Validate one plain database hostname without an embedded port."""

        # Database ports have a dedicated field, so host values contain only DNS names or IP literals.
        value = host.strip().rstrip("/")
        parsed = urllib.parse.urlsplit(f"//{value}")

        # Accessing the parsed port rejects malformed numeric values before the structural checks.
        try:
            parsed_port = parsed.port
        except ValueError as exc:
            raise ValueError("Database host port is invalid") from exc
        if (
            not value
            or "://" in value
            or parsed.hostname is None
            or parsed_port is not None
            or parsed.username
            or parsed.password
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or any(character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value)
        ):
            raise ValueError("Database host is invalid")
        return value


class StorageConfiguration(BaseModel):
    """Object-storage connection configuration for one registry."""

    # Kind
    kind: StorageKind

    # Connection
    endpoint_url: str = Field(min_length=1, max_length=255)
    access_key_id: str | None = Field(default=None, min_length=1, max_length=255)
    secret_access_key: str | None = Field(default=None, min_length=1, max_length=255)
    runtime_endpoint_url: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def validate_provider(self) -> Self:
        """Validate provider-specific credentials and endpoints."""

        # MinIO uses registry credentials, while Exoscale credentials come from Platform environment settings.
        if self.kind == StorageKind.minio and (self.access_key_id is None or self.secret_access_key is None):
            raise ValueError("MinIO storage requires access_key_id and secret_access_key")
        if self.kind == StorageKind.exoscale and (self.access_key_id is not None or self.secret_access_key is not None):
            raise ValueError("Exoscale provisioning credentials must be configured through Platform environment variables")

        # Keep Exoscale control and runtime traffic on the same zone-specific HTTPS endpoint.
        if self.kind == StorageKind.exoscale:
            zone = exoscale_zone(self.endpoint_url)
            runtime_zone = exoscale_zone(self.runtime_endpoint_url or self.endpoint_url)
            if runtime_zone != zone:
                raise ValueError("Exoscale control and runtime storage endpoints must use the same zone")

        return self

    @field_validator("endpoint_url", "runtime_endpoint_url")
    @classmethod
    def validate_endpoint_url(cls, endpoint_url: str | None) -> str | None:
        """Validate one ordinary HTTP(S) object-storage endpoint."""

        # Optional runtime endpoints fall back to the control endpoint.
        if endpoint_url is None:
            return None
        value = endpoint_url.strip().rstrip("/")
        parsed = urllib.parse.urlsplit(value)
        if (
            not value
            or parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
            or any(character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value)
        ):
            raise ValueError("Storage endpoint URL is invalid")

        # Accessing the port rejects malformed numeric values at the request boundary.
        try:
            parsed.port
        except ValueError as exc:
            raise ValueError("Storage endpoint URL port is invalid") from exc
        return value


class RegistryOption(BaseModel):
    """Expose one assignable infrastructure registry without connection metadata."""

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str


class InfrastructureOptionsResponse(BaseModel):
    """Expose infrastructure choices available during Organization creation."""

    # Registries
    computes: list[RegistryOption]
    databases: list[RegistryOption]
    storages: list[RegistryOption]
