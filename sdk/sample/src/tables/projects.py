from enum import Enum
from typing import Optional
from longlink import Table
from sqlmodel import Field, SQLModel


class ProjectStatus(str, Enum):
    """Lifecycle states for a project record."""

    PLANNED = "Planned"
    ACTIVE = "Active"
    COMPLETED = "Completed"


class LinkedContact(SQLModel):
    """Embedded contact information for a project."""

    id: str
    name: str
    email: Optional[str] = None


class Project(Table):
    """Project table stored in the sample application database."""

    id: str = Field(description="Unique project identifier")
    name: str = Field(description="Project name")
    linked_contact: LinkedContact = Field(description="Associated contact")
    status: ProjectStatus = Field(default=ProjectStatus.PLANNED, description="Project status")
    budget: float = Field(ge=0, description="Project budget in currency units")
    owner: str = Field(description="Project owner name or ID")
