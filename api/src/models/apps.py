from typing import Annotated

from pydantic import BaseModel, BeforeValidator, field_validator


def normalize_app_name(value: str) -> str:
    """Trim whitespace and lowercase app names."""

    return value.strip().lower()


AppName = Annotated[str, BeforeValidator(normalize_app_name)]


class AppCreate(BaseModel):
    name: AppName
    image: str

    @field_validator("image", mode="before")
    @classmethod
    def normalize_image(cls, value: str) -> str:
        """Normalize image reference by trimming outer whitespace."""
        return value.strip()


class AppResponse(BaseModel):
    name: str
    url: str
