from typing import Literal
from pydantic import Field, BaseModel, ConfigDict


class ProjectRead(BaseModel):
    """Present a building project and its construction progress."""

    model_config = ConfigDict(from_attributes=True)

    # Project fields
    id: int
    name: str
    photo: Literal["riverside", "skyline", "garden", "harbor"]
    status: Literal["Planning", "In progress", "Completed"]
    description: str
    active_step: int = Field(ge=0, le=5)


class DocumentRead(BaseModel):
    """Describe an illustrative construction document checklist entry."""

    # Document fields
    name: str
    available: bool


class PhaseRead(BaseModel):
    """Describe a construction phase and its example document checklist."""

    # Phase fields
    label: str
    documents: list[DocumentRead]
    description: str
