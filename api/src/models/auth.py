from pydantic import Field, BaseModel
from longlink.shared.models import Email


class TokenPayload(BaseModel):
    """Validate one unchanged authentication token."""

    # Authentication
    token: str = Field(min_length=1, max_length=4096)


class EmailPayload(BaseModel):
    """Return one verified email address."""

    # Identity
    email: Email


class PasswordLogin(BaseModel):
    """Validate one local password login request."""

    # Identity
    email: Email = Field(max_length=254)

    # Authentication
    password: str = Field(min_length=1, max_length=1024)


class RegistrationComplete(BaseModel):
    """Validate profile and password setup after email authentication."""

    # Profile
    name: str = Field(min_length=1, max_length=255)

    # Authentication
    password: str = Field(min_length=1, max_length=1024)


class PasswordResetComplete(BaseModel):
    """Validate a new password supplied with browser-only reset proof."""

    # Authentication
    password: str = Field(min_length=1, max_length=1024)
