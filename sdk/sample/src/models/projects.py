from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel

"""
Features:
Status workflow transitions
File attachments
Task list (embedded)
"""


class ProjectStatus(str, Enum):
    PLANNED = "Planned"
    ACTIVE = "Active"
    COMPLETED = "Completed"


class LinkedContact(SQLModel):
    id: str
    name: str
    email: Optional[str] = None


class Project(SQLModel):
    id: str = Field(description="Unique project identifier")
    name: str = Field(description="Project name")
    linked_contact: LinkedContact = Field(description="Associated contact")
    status: ProjectStatus = Field(default=ProjectStatus.PLANNED, description="Project status")
    budget: float = Field(ge=0, description="Project budget in currency units")
    owner: str = Field(description="Project owner name or ID")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
