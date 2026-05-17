from datetime import datetime

from sqlmodel import Field, SQLModel


class UserModel(SQLModel):
    """Minimal typed payload returned by the showcase route."""

    id: int
    username: str = Field(min_length=3, max_length=30)
    email: str
    created_at: datetime = Field(default_factory=datetime.now)
