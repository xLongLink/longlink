from longlink import User
from pydantic import BaseModel, ConfigDict


class TaskRead(BaseModel):
    """Present one saved task in the task table."""

    model_config = ConfigDict(from_attributes=True)

    # Task fields
    id: int
    title: str
    attachment: str | None

    # Audit fields
    created_by: User
