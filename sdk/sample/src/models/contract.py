from enum import Enum
from longlink import db


class StatusEnum(str, Enum):
    LEAD = "Lead"
    ACTIVE = "Active"
    ARCHIVED = "Archived"


class Contract(db.Table):
    name: str
    company: str
    email: str
    status: StatusEnum
