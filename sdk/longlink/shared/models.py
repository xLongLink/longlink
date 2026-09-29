from uuid import UUID
from typing import Annotated
from pydantic import EmailStr, AfterValidator
from sqlmodel import Field, SQLModel
from sqlalchemy import Uuid, Column, String

Email = Annotated[EmailStr, AfterValidator(str.lower)]


class User(SQLModel, table=True):
    """Represent one Platform-owned Organization user shared across its Solutions.

    Solutions have read-only access to this shared-schema projection.
    """

    __tablename__ = "audit"

    # Identifier
    id: UUID = Field(sa_column=Column(Uuid(as_uuid=True), primary_key=True))

    # Metadata
    name: str = Field(sa_column=Column(String(255), nullable=False))
    email: Email = Field(sa_column=Column(String(254), nullable=False))
    avatar: str = Field(default="", sa_column=Column(String(2048), nullable=False))
