from enum import Enum
from longlink import Table
from pydantic import EmailStr


class StatusEnum(str, Enum):
    LEAD = "Lead"
    ACTIVE = "Active"
    ARCHIVED = "Archived"


class Contract(Table):
    name: str
    company: str
    email: EmailStr
    status: StatusEnum
