from typing import Literal
from longlink import Model
from sqlmodel import Field


class Project(Model, table=True):
    """Track a building project through its construction lifecycle."""

    # Project fields
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    photo: str = Field(max_length=32)
    description: str = Field(max_length=255)
    active_step: int = Field(default=0, ge=0, le=5)

    @property
    def status(self) -> Literal["Planning", "In progress", "Completed"]:
        """Derive the project state from its current construction phase."""

        # Keep the displayed status consistent with the project's progress.
        if self.active_step == 0:
            return "Planning"
        if self.active_step == 5:
            return "Completed"
        return "In progress"
