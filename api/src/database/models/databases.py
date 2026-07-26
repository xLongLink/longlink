from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field, SQLModel
from src.models.types import DatabaseSSLMode


class DatabaseRegistry(SQLModel, table=True):
    """Persist one database backend available to Organizations.

    Reconciliation creates one database per Organization and one isolated schema and runtime role per LongLink Application.
    """

    __tablename__: ClassVar[str] = "database_registries"

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    name: str = Field(unique=True, max_length=128)
    slug: str = Field(max_length=128, unique=True, sa_column_kwargs={"nullable": False})

    # Connection
    host: str = Field(max_length=255)
    port: int
    password: str = Field(max_length=255)
    sslmode: DatabaseSSLMode = Field(default=DatabaseSSLMode.require, max_length=16)
    username: str = Field(max_length=255)
