from pydantic import BaseModel, ConfigDict, EmailStr


class OidcUserInfo(BaseModel):
    """Represent the OIDC userinfo payload returned by Keycloak."""

    model_config = ConfigDict(extra="ignore")

    sub: str
    email: EmailStr | None = None
    name: str | None = None
    preferred_username: str | None = None
    given_name: str | None = None
    family_name: str | None = None
    picture: str | None = None


class OidcTokenResponse(BaseModel):
    """Represent the OIDC token response returned by the provider."""

    model_config = ConfigDict(extra="ignore")

    access_token: str
    token_type: str | None = None
    expires_in: int | None = None
    refresh_token: str | None = None
    scope: str | None = None
    id_token: str | None = None
    userinfo: OidcUserInfo | None = None
