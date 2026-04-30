from sqlmodel import Field
from src.db.models.__base__ import Base


class Registry(Base, table=True):
    """Represent a Docker registry secret stored for the platform."""
    __tablename__ = 'registries'

    name: str = Field(primary_key=True, max_length=128)
    email: str = Field(max_length=255)
    server: str = Field(max_length=255)
    username: str = Field(max_length=255)
