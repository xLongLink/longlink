from typing import Any

from pydantic import BaseModel, Field


class StorageCreate(BaseModel):
    type: str
    base_path: str
    options: dict[str, Any] = Field(default_factory=dict)


class StorageUpdate(BaseModel):
    type: str
    base_path: str
    options: dict[str, Any] = Field(default_factory=dict)


class StorageResponse(BaseModel):
    id: int
    type: str
    base_path: str
    options: dict[str, Any]
    connection_url: str
