from enum import Enum
from pydantic import BaseModel, field_validator
from src.utils import url


class AppType(str, Enum):
    tool = 'tool'
    space = 'space'
    process = 'process'


class AppCreate(BaseModel):
    id: str | None = None
    url: str
    key: str

    @field_validator('url', mode='before')
    @classmethod
    def normalize_url_field(cls, value: str) -> str:
        return url.normalize(value)

    @field_validator('id', mode='before')
    @classmethod
    def normalize_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class AppMetadata(BaseModel):
    name: str
    type: AppType = AppType.tool


class AppResponse(BaseModel):
    id: str
    name: str
    url: str
    type: AppType
