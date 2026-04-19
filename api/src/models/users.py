from pydantic import EmailStr, BaseModel


class UserUpdate(BaseModel):
    """Payload to update mutable user profile fields."""

    name: str | None = None
    email: EmailStr | None = None
    avatar: str | None = None
