from pydantic import BaseModel


class AppCreate(BaseModel):
    name: str
    url: str
    token: str


class AppResponse(BaseModel):
    id: int
    name: str
    url: str
