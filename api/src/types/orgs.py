from datetime import datetime
from pydantic import BaseModel


class OrgCreate(BaseModel):
    name: str
    country: str | None = None
    crn: str | None = None
    vat: str | None = None


class OrgRead(BaseModel):
    id: int
    name: str
    url: str
    country: str | None
    crn: str | None
    vat: str | None
    date_creation: datetime
