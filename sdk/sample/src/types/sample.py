from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel


class UserModel(SQLModel):
    id: int
    username: str = Field(min_length=3, max_length=30)
    email: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    age: Optional[int] = None
