from pydantic import Field, EmailStr, BaseModel, ConfigDict


class OidcUserInfo(BaseModel):
    """Represent the OIDC userinfo payload returned by Keycloak."""

    model_config = ConfigDict(extra="ignore")

    # Identity
    sub: str = Field(min_length=1, max_length=255)
    email: EmailStr | None = None
    email_verified: bool | None = None

    # Profile
    name: str | None = Field(default=None, max_length=255)
    picture: str | None = Field(default=None, max_length=2048)
    given_name: str | None = Field(default=None, max_length=255)
    family_name: str | None = Field(default=None, max_length=255)
    preferred_username: str | None = Field(default=None, max_length=255)
