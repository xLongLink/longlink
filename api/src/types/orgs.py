from datetime import datetime
from pydantic import BaseModel


class OrgCreate(BaseModel):
    name: str
    country: str | None = None


class OrgRead(BaseModel):
    id: int
    name: str
    url: str
    country: str | None
    date_creation: datetime
