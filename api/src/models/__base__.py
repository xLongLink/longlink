from typing import Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Represent a standard API response envelope."""

    success: bool = True
    message: str | None = None
    data: T | None = None
