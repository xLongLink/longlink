from pydantic import BaseModel


class DatabaseCreateResponse(BaseModel):
    database: str
    status: str = 'created'
