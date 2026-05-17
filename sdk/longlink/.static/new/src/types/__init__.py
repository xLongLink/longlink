"""Pydantic types package for the blank app scaffold."""

from pydantic import BaseModel


class User(BaseModel):
    """Minimal user type."""

    id: int
    name: str
