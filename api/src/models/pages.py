from pydantic import BaseModel


class PageInfo(BaseModel):
    name: str
    path: str
    icon: str = "file-text"
