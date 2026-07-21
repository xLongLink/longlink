from uuid import UUID
from pydantic import Field, EmailStr, BaseModel
from fastapi_users import schemas


class AuthConfig(BaseModel):
    """Describe authentication methods enabled for this installation."""

    github_enabled: bool


class AuthUser(schemas.BaseUser[UUID]):
    """Represent the account fields returned by generated authentication routes."""

    name: str = Field(min_length=1, max_length=255)
    avatar: str = ""


class AuthUserCreate(schemas.BaseUserCreate):
    """Validate local email and password registration input."""

    name: str = Field(min_length=1, max_length=255)
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=12, max_length=1024)


class VerificationRequest(BaseModel):
    """Validate an email verification-link request."""

    # Account
    email: EmailStr = Field(max_length=254)


class VerificationTokenConfirm(BaseModel):
    """Validate one emailed account verification token."""

    # Verification
    token: str = Field(min_length=1)
