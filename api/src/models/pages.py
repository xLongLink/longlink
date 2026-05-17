from pydantic import BaseModel


class PageInfo(BaseModel):
    name: str
    path: str
    content: str | None = None
