from uuid import UUID, uuid4
from typing import ClassVar
from datetime import datetime
from sqlmodel import Field
from sqlalchemy import Enum, Column, UniqueConstraint
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime
from src.database.models.base import PlatformModel


class OrganizationInvitation(PlatformModel, table=True):
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

    # Timing
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
