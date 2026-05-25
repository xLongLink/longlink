from sqlmodel import Field

from src.db.models.__base__ import Base


class Permission(Base, table=True):
    """Represent a fine-grained capability that can be attached to roles."""

    __tablename__ = 'permissions'

    name: str = Field(primary_key=True, max_length=128)
    description: str | None = Field(default=None, max_length=255)
