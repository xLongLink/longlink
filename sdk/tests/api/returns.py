# TODO: Check that the 
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Example that return a Pydantic model
@post("/sample/user")
async def sample_post_user_endpoint() -> UserModel:
    return UserModel(
        id=1,
        username="testuser",
        email="testuser@example.com",
        is_active=True,
        age=30
    )



class UserModel(BaseModel):
    id: int
    username: str = Field(min_length=3, max_length=30)
    email: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    age: Optional[int] = None

