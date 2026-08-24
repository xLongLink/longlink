from uuid import UUID
from typing import ClassVar
from datetime import datetime
from pydantic import EmailStr, GetCoreSchemaHandler
from sqlmodel import Field
from sqlalchemy import Uuid, Column, String
from pydantic_core import core_schema
from longlink.database.types import UTCDateTime
from longlink.database.registry import Base


class Email(EmailStr):
    """Validate and normalize one canonical email identity."""

    @classmethod
    def __get_pydantic_core_schema__(cls, _source_type: object, handler: GetCoreSchemaHandler) -> core_schema.CoreSchema:
        """Normalize an address before Pydantic validates its email format."""

        # Keep identity comparisons and persistence case-insensitive.
        return core_schema.no_info_before_validator_function(
            lambda value: value.strip().lower() if isinstance(value, str) else value,
            handler.generate_schema(EmailStr),
        )


class Audit(Base, table=True):
    """Represent one Platform-owned Organization user shared across all Organization Applications.

    Applications have read-only access to this shared-schema projection.
    """

    __tablename__: ClassVar[str] = "audit"

    # Identifier
    id: UUID = Field(sa_column=Column(Uuid(as_uuid=True), primary_key=True))

    # Metadata
    name: str = Field(sa_column=Column(String(255), nullable=False))
    role: str = Field(default="read", sa_column=Column(String(32), nullable=False))
    email: Email = Field(sa_column=Column(String(254), nullable=False))
    avatar: str = Field(default="", sa_column=Column(String(2048), nullable=False))

    # Platform-controlled audit timestamps are supplied during audit synchronization.
    created_at: datetime = Field(sa_type=UTCDateTime)
    updated_at: datetime = Field(sa_type=UTCDateTime)
    deleted_at: datetime | None = Field(default=None, sa_type=UTCDateTime)
