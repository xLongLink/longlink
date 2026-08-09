from uuid import UUID
from typing import TYPE_CHECKING, ClassVar
from datetime import datetime
from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Column
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from longlink.database.types import UTCDateTime

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.organizations import Organization


from src.database.models.base import PlatformModel


class UserOrganization(PlatformModel, table=True):
    """Persist the authoritative Organization role assigned to one LongLink Platform user."""

    __tablename__: ClassVar[str] = "user_organizations"

    # Identifier
    user_id: UUID = Field(default=None, primary_key=True, foreign_key="users.id")
    organization_id: UUID = Field(default=None, primary_key=True, foreign_key="organizations.id")

    # State
    role: OrganizationRoles = Field(
        sa_column=Column(Enum(OrganizationRoles, name="organization_role_enum", native_enum=False), nullable=False)
    )

    # Audit
    created_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime)
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, nullable=False, sa_type=UTCDateTime, sa_column_kwargs={"onupdate": utcnow})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, nullable=True, sa_type=UTCDateTime)
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    user: "User" = Relationship(
        back_populates="organization_memberships",
        sa_relationship_kwargs={"foreign_keys": "UserOrganization.user_id"},
    )
    organization: "Organization" = Relationship(sa_relationship_kwargs={"foreign_keys": "UserOrganization.organization_id"})
