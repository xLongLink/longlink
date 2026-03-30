from typing import Literal
from pydantic import BaseModel


class DatabaseCreate(BaseModel):
    type: Literal['postgresql'] = 'postgresql'
    host: str
    port: int
    name: str
    username: str
    password: str


class DatabaseUpdate(BaseModel):
    type: Literal['postgresql'] = 'postgresql'
    host: str
    port: int
    name: str
    username: str
    password: str


class DatabaseResponse(BaseModel):
    id: int
    type: str
    host: str
    port: int
    name: str
    username: str
    password: str
    connection_url: str
