from pydantic import Field, EmailStr, BaseModel, field_validator


def normalize_email(value: object) -> object:
    """Normalize one email identity before Pydantic validates its address format."""

    # Preserve Pydantic's type validation for values that are not strings.
    return value.strip().lower() if isinstance(value, str) else value


class EmailPayload(BaseModel):
    """Validate one canonical email identity."""

    # Identity
    email: EmailStr = Field(max_length=254)

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: object) -> object:
        """Normalize email identity before validating its address format."""

        # Keep identity comparisons and persistence case-insensitive.
        return normalize_email(value)


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
