from typing import Annotated
from pydantic import Field, EmailStr, BaseModel, StringConstraints

TrimmedName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=127)]
TrimmedToken = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4096)]


class AuthConfig(BaseModel):
    """Describe authentication methods enabled for this installation."""

    github_enabled: bool


class RegistrationRequest(BaseModel):
    """Validate a stateless email registration request."""

    # Identity
    email: EmailStr = Field(max_length=254)

    # Navigation
    next: str = Field(default="/organizations", min_length=1, max_length=2048)


class RegistrationTokenConfirm(BaseModel):
    """Validate one emailed registration token."""

    # Authentication
    token: TrimmedToken


class RegistrationVerified(BaseModel):
    """Return the email authenticated by a registration token."""

    # Identity
    email: EmailStr

    # Navigation
    next: str


class RegistrationComplete(BaseModel):
    """Validate profile and password setup after email authentication."""

    # Profile
    name: TrimmedName
    email: EmailStr = Field(max_length=254)
    surname: TrimmedName

    # Authentication
    password: str = Field(min_length=12, max_length=1024)


class PasswordResetRequest(BaseModel):
    """Validate a non-enumerating password reset request."""

    # Identity
    email: EmailStr = Field(max_length=254)

    # Navigation
    next: str = Field(default="/organizations", min_length=1, max_length=2048)


class PasswordResetTokenConfirm(BaseModel):
    """Validate one emailed password reset token."""

    # Authentication
    token: TrimmedToken


class PasswordResetComplete(BaseModel):
    """Validate a new password supplied with browser-only reset proof."""

    # Authentication
    password: str
