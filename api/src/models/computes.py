import urllib.parse
from uuid import UUID
from datetime import datetime
from pydantic import Field, BaseModel, ConfigDict, field_validator
from src.models.users import UserSummary


class ComputeRegistryCreate(BaseModel):
    """Request body for creating a compute registry."""

    # Metadata
    name: str
    kubeconfig: str
    gateway_url: str = Field(min_length=1, max_length=512)

    # Relationships
    location_id: UUID

    @field_validator("gateway_url")
    @classmethod
    def validate_gateway_url(cls, gateway_url: str) -> str:
        """Validate an absolute API-facing gateway URL."""

        value = gateway_url.strip().rstrip("/")

        # Gateway URLs must be non-empty and safe to use as proxy origins.
        if not value or any(
            character.isspace() or ord(character) < 32 or ord(character) == 127 for character in value
        ):
            raise ValueError("Gateway URL contains invalid characters")

        parsed_value = urllib.parse.urlsplit(value)

        # Gateway URLs must be absolute HTTP(S) origins reachable by the API.
        if parsed_value.scheme not in {"http", "https"} or not parsed_value.netloc:
            raise ValueError("Gateway URL must use HTTP or HTTPS")

        # Gateway origins must not carry credentials, paths, query strings, or fragments.
        if (
            parsed_value.hostname is None
            or parsed_value.username
            or parsed_value.password
            or parsed_value.path not in {"", "/"}
            or parsed_value.query
            or parsed_value.fragment
        ):
            raise ValueError("Gateway URL is invalid")

        # Access the port property so invalid numeric ports are rejected by urllib.
        try:
            parsed_value.port
        except ValueError as exc:
            raise ValueError("Gateway URL port is invalid") from exc

        return value


class ComputeRegistryResponse(BaseModel):
    """Represent one compute registry in API responses."""

    model_config = ConfigDict(from_attributes=True)

    # Identifier
    id: UUID

    # Metadata
    name: str
    slug: str
    gateway_url: str

    # Relationships
    location_id: UUID

    # Audit
    created_at: datetime
    created_by: UserSummary
    updated_at: datetime
    updated_by: UserSummary
    deleted_at: datetime | None = None
    deleted_by: UserSummary | None = None


class PodResponse(BaseModel):
    """Represent a pod in a namespace."""

    # Metadata
    name: str
    node: str | None = None

    # State
    status: str
