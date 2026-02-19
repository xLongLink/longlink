from pydantic import BaseModel, EmailStr
from enum import Enum


"""
Features
Create / Edit
Role-based visibility
Attach documents
"""


class StatusEnum(str, Enum):
    LEAD = "Lead"
    ACTIVE = "Active"
    ARCHIVED = "Archived"


class Contract(BaseModel):
    name: str
    company: str
    email: EmailStr
    status: StatusEnum


