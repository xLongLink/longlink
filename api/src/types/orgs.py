from datetime import datetime
from pydantic import BaseModel


class OrgCreate(BaseModel):
    name: str


class OrgRead(BaseModel):
    id: int
    name: str
    date_creation: datetime
