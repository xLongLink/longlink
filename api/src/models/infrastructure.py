import urllib.parse
from enum import StrEnum
from typing import Literal
from pydantic import Field, BaseModel, field_validator

DatabaseSSLMode = Literal["disable", "allow", "prefer", "require", "verify-ca", "verify-full"]
DATABASE_SSL_MODES = frozenset[DatabaseSSLMode]({"disable", "allow", "prefer", "require", "verify-ca", "verify-full"})


class ComputeConfiguration(BaseModel):
    """Kubernetes connection configuration for one location."""

    # Connection
    kubeconfig: str = Field(min_length=1, max_length=1024 * 1024)


class DatabaseKind(StrEnum):
    """Supported database backend kinds."""

    postgresql = "postgresql"


class DatabaseConfiguration(BaseModel):
    """Database connection configuration for one location."""

    # Kind
    kind: DatabaseKind

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


class StorageKind(StrEnum):
    """Supported storage backend kinds."""

    minio = "minio"
    exoscale = "exoscale"


class StorageConfiguration(BaseModel):
    """Object-storage connection configuration for one location."""

    # Kind
    kind: StorageKind

    # Connection
    endpoint_url: str = Field(min_length=1, max_length=255)
    access_key_id: str = Field(min_length=1, max_length=255)
    secret_access_key: str = Field(min_length=1, max_length=255)
    runtime_endpoint_url: str | None = Field(default=None, max_length=255)

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
