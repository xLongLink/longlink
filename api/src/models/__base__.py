from typing import Any, Generic, TypeVar

from pydantic import BaseModel


T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Represent a standard API response envelope."""

    success: bool = True
    detail: str | list[dict[str, Any]] | dict[str, Any] | None = None
    data: T | None = None
