from abc import ABC, abstractmethod
from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


class User(Base):
    """Shared organization user stored in the public schema."""
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class Database(ABC):
    """Database adapter.

    Server              # Connected to the database server, e.g. PostgreSQL, MySQL
    └── Database        # One for each organization
        └── Schema      # One for each application
            └── Tables  # Managed by the application ORM, e.g. Prisma, SQLAlchemy

    Database structure for one organization:
    ├── (org) Users + other shared tables
    ├── (app a) Schema
    └── (app ...) Schema

    Each application has read/write access to it's own schema, and read-only access to shared tables.
    """

    @abstractmethod
    async def database(self, organization: str) -> str:
        """Create the database for an organization if it does not exist and return a connection DSN."""

    @abstractmethod
    async def schema(self, organization: str, application: str) -> str:
        """Create or replace the schema for one application and return a connection DSN."""

    @abstractmethod
    async def remove(self, organization: str, application: str) -> None:
        """Remove one application schema from the organization database."""

    @abstractmethod
    async def delete(self, organization: str) -> None:
        """Delete the organization database and all managed application schemas."""

