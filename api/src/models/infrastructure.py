import re
import urllib.parse
from pydantic import Field, BaseModel, field_validator
from src.models.types import DatabaseSSLMode


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


class DatabaseConfiguration(BaseModel):
    """Database connection configuration for one registry."""

    # Connection
    host: str = Field(min_length=1, max_length=255)
    port: int = Field(ge=1, le=65535)
    password: str = Field(min_length=1, max_length=255)
    sslmode: DatabaseSSLMode = DatabaseSSLMode.require
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

    # Connection
    endpoint_url: str = Field(min_length=1, max_length=255)

    # Credentials
    access_key_id: str = Field(min_length=1, max_length=255)
    secret_access_key: str = Field(min_length=1, max_length=255)

    @field_validator("endpoint_url")
    @classmethod
    def validate_endpoint_url(cls, endpoint_url: str) -> str:
        """Validate one Exoscale SOS endpoint."""

        # Normalize and validate the provider endpoint before persistence.
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

        # Storage registries currently support only zone-specific Exoscale SOS endpoints.
        exoscale_zone(value)
        return value
