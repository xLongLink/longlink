from longlink import User
from pydantic import Field, BaseModel, ConfigDict


class TaskCreate(BaseModel):
    """Validate a task submitted through the creation form."""

    model_config = ConfigDict(str_strip_whitespace=True)

    # Task fields
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1, max_length=5000)


class TaskRead(BaseModel):
    """Present one saved task in the task table."""

    model_config = ConfigDict(from_attributes=True)

    # Task fields
    id: int
    title: str
    description: str

    # Audit fields
    created_by: User
