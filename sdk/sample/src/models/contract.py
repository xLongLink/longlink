from enum import Enum
from longlink import Table


class StatusEnum(str, Enum):
    LEAD = "Lead"
    ACTIVE = "Active"
    ARCHIVED = "Archived"


class Contract(Table):
    name: str
    company: str
    email: str
    status: StatusEnum
