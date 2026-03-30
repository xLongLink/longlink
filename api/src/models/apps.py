from pydantic import BaseModel


class AppCreate(BaseModel):
    url: str
    key: str


class AppResponse(BaseModel):
    id: str
    name: str
    url: str
    type: str
