"""Database models package for the blank app scaffold."""

from pydantic import BaseModel


class Project(BaseModel):
    """Minimal project payload."""

    name: str
