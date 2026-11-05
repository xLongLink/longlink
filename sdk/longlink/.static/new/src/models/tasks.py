from longlink import Audit
from sqlmodel import Field


class Task(Audit, table=True):
    """Store a task with attribution to the user who created it."""

    # Task fields
    id: int | None = Field(default=None, primary_key=True)
    title: str = Field(max_length=255)
    attachment: str | None = Field(default=None, max_length=256)
