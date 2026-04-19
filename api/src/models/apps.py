from enum import Enum
from pydantic import BaseModel, field_validator


class AppType(str, Enum):
    tool = "tool"
    space = "space"
    process = "process"


class AppCreate(BaseModel):
    key: str
    image: str

    @field_validator("image", mode="before")
    @classmethod
    def normalize_image(cls, value: str) -> str:
        """Normalize image reference by trimming outer whitespace."""
        return value.strip()


class AppMetadata(BaseModel):
    name: str
    type: AppType = AppType.tool


class AppResponse(BaseModel):
    id: str
    name: str
    url: str
    type: AppType
