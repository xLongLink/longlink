from pydantic import EmailStr, BaseModel, ConfigDict


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
