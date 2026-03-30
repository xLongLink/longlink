from pydantic import BaseModel


class AppCreate(BaseModel):
    appid: str
    url: str
    token: str


class AppResponse(BaseModel):
    id: str
    name: str
    url: str
