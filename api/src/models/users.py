from pydantic import EmailStr, BaseModel


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    avatar: str | None = None


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    avatar: str | None = None
    oauth_github_id: int | None = None
