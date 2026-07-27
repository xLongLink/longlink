from pydantic import Field, BaseModel


class EmailPayload(BaseModel):
    """Validate one unchanged email value."""

    # Identity
    email: str = Field(min_length=1, max_length=254)


class TokenPayload(BaseModel):
    """Validate one unchanged authentication token."""

    # Authentication
    token: str = Field(min_length=1, max_length=4096)


class PasswordLogin(EmailPayload):
    """Validate one local password login request."""

    # Authentication
    password: str = Field(min_length=1, max_length=1024)


class RegistrationComplete(EmailPayload):
    """Validate profile and password setup after email authentication."""

    # Profile
    name: str = Field(min_length=1, max_length=127)
    surname: str = Field(min_length=1, max_length=127)

    # Authentication
    password: str = Field(min_length=1, max_length=1024)


class PasswordResetComplete(BaseModel):
    """Validate a new password supplied with browser-only reset proof."""

    # Authentication
    password: str = Field(min_length=1, max_length=1024)
