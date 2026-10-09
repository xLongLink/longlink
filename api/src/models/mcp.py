from uuid import UUID
from typing import Literal
from datetime import datetime
from pydantic import Field, HttpUrl, BaseModel, field_validator


class ClientRegistration(BaseModel):
    """Accept only public authorization-code clients with fixed safe callbacks."""

    # Client metadata
    client_name: str = Field(default="MCP client", min_length=1, max_length=128)
    grant_types: list[Literal["authorization_code"]] = Field(default=["authorization_code"], min_length=1, max_length=1)
    redirect_uris: list[str] = Field(min_length=1, max_length=10)
    response_types: list[Literal["code"]] = Field(default=["code"], min_length=1, max_length=1)
    token_endpoint_auth_method: Literal["none"] = "none"  # noqa: S105

    @field_validator("redirect_uris")
    @classmethod
    def validate_redirects(cls, values: list[str]) -> list[str]:
        """Reject ambiguous or unsafe callbacks without fetching client-controlled URLs."""

        # Permit HTTPS and local HTTP clients, but never credentials, fragments, or control characters.
        for value in values:
            parsed = HttpUrl(value)
            if (
                len(value) > 2048
                or any(character.isspace() or ord(character) < 32 for character in value)
                or "\\" in value
                or parsed.username is not None
                or parsed.password is not None
                or parsed.fragment is not None
                or (parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.host in {"localhost", "127.0.0.1", "[::1]"}))
            ):
                raise ValueError("Callbacks must use HTTPS (or loopback HTTP) without credentials or fragments")
        return values


class RegisteredClient(ClientRegistration):
    """Return public registration metadata, never a confidential client credential."""

    # Assigned client identity
    client_id: UUID


class AuthorizationRequest(BaseModel):
    """Validate authorization parameters before any external redirect is allowed."""

    # Requested access
    state: str = Field(min_length=1, max_length=1024)
    scope: Literal["mcp"] = "mcp"
    resource: str = Field(max_length=2048)
    client_id: UUID
    redirect_uri: str = Field(max_length=2048)
    response_type: Literal["code"]
    code_challenge: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$")
    code_challenge_method: Literal["S256"]


class Approval(AuthorizationRequest):
    """Bind explicit browser approval to the validated authorization request."""

    # Consent decision
    approve: bool


class Consent(BaseModel):
    """Describe the actual client callback and selected Solution to the user."""

    # Approval context
    client_name: str
    redirect_uri: str
    solution_name: str


class AuthorizationRedirect(BaseModel):
    """Return a validated client redirect after a browser consent decision."""

    # Navigation
    url: str


class AccessToken(BaseModel):
    """Return a short-lived opaque MCP access credential."""

    # Token response
    scope: Literal["mcp"] = "mcp"
    token_type: Literal["Bearer"] = "Bearer"  # noqa: S105
    expires_in: int
    access_token: str


class OAuthFailure(BaseModel):
    """Describe OAuth errors without returning submitted credentials."""

    # Protocol error
    error: str
    error_description: str


class TokenSummary(BaseModel):
    """Expose revocation handles without access credentials or hashes."""

    # Granted access
    id: UUID
    client_id: UUID
    expires_at: datetime
    solution_id: UUID


class ResourceMetadata(BaseModel):
    """Publish RFC 9728 resource discovery for one Solution endpoint."""

    # Resource metadata
    resource: str
    scopes_supported: list[str]
    authorization_servers: list[str]
    bearer_methods_supported: list[str] = ["header"]


class ServerMetadata(BaseModel):
    """Publish the supported public-client OAuth authorization flow."""

    # Authorization server metadata
    issuer: str
    token_endpoint: str
    scopes_supported: list[str]
    revocation_endpoint: str
    grant_types_supported: list[str]
    registration_endpoint: str
    authorization_endpoint: str
    response_types_supported: list[str]
    code_challenge_methods_supported: list[str]
    token_endpoint_auth_methods_supported: list[str]
