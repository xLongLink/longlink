from sqlmodel import Field

from src.db.models.__base__ import Base


class DatabaseRegistry(Base, table=True):
    """Represent a registered database backend."""

    __tablename__ = "database_registries"

    name: str = Field(primary_key=True, max_length=128)
    host: str = Field(max_length=255)
    port: int
    username: str = Field(max_length=255)
    password: str = Field(max_length=255)
    sslmode: str | None = Field(default=None, max_length=32)
    maintenance_database: str = Field(default="postgres", max_length=255)
