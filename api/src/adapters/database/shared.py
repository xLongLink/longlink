from uuid import UUID
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field, SQLModel
from sqlalchemy import Uuid, Column, String, MetaData, TIMESTAMP

shared_users_metadata = MetaData()


class SharedUser(SQLModel, table=True):
    """Represent one user in an organization's shared application database table."""

    __tablename__: ClassVar[str] = "users"
    __table_args__ = {"schema": "public"}
    metadata = shared_users_metadata

    # Identifier
    id: UUID = Field(sa_column=Column(Uuid(as_uuid=True), primary_key=True))

    # Metadata
    name: str = Field(sa_column=Column(String(255), nullable=False))
    email: str = Field(sa_column=Column(String(254), nullable=False))
    avatar: str = Field(default="", sa_column=Column(String(2048), nullable=False, server_default=""))
    role_name: str = Field(sa_column=Column(String(32), nullable=False))

    # Audit
    created_at: datetime = Field(sa_column=Column(TIMESTAMP(timezone=True), nullable=False))
    updated_at: datetime = Field(sa_column=Column(TIMESTAMP(timezone=True), nullable=False))
    deleted_at: datetime | None = Field(default=None, sa_column=Column(TIMESTAMP(timezone=True)))
