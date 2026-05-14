from pydantic import BaseModel


class Project(BaseModel):
    """Minimal project payload."""

    name: str
