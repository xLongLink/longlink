from enum import Enum
from pydantic import EmailStr
from sqlmodel import SQLModel



class StatusEnum(str, Enum):
    LEAD = "Lead"
    ACTIVE = "Active"
    ARCHIVED = "Archived"


class Contract(SQLModel):
    name: str
    company: str
    email: EmailStr
    status: StatusEnum
