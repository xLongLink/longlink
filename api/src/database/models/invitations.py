from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import Enum, Column, UniqueConstraint
from src.models.roles import OrganizationRoles
from src.database.models.base import AuditTable


class OrganizationInvitation(AuditTable, table=True):
    """Represent one active organization email grant."""

    __tablename__: ClassVar[str] = "organization_invitations"
    __table_args__ = (UniqueConstraint("organization_id", "email"),)

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Metadata
    email: str = Field(max_length=320)

    # Relationships
    organization_id: UUID = Field(foreign_key="organizations.id", ondelete="CASCADE")

    # State
    role: OrganizationRoles = Field(
        sa_column=Column(Enum(OrganizationRoles, name="organization_role_enum", native_enum=False), nullable=False)
    )
