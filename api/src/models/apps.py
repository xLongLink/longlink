from pydantic import BaseModel


class AppCreate(BaseModel):
    url: str
    token: str


class AppResponse(BaseModel):
    id: str
    name: str
    url: str
