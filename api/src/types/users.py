from pydantic import BaseModel, EmailStr


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    avatar: str | None = None
