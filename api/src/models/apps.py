from pydantic import BaseModel


class AppCreate(BaseModel):
    id: str | None = None
    url: str
    key: str


class AppResponse(BaseModel):
    id: str
    name: str
    url: str
    type: str
