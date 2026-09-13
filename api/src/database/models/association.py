from uuid import UUID
from typing import TYPE_CHECKING, ClassVar
from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Column
from src.models.roles import OrganizationRoles

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.users import User
    from src.database.models.organizations import Organization

from src.database.models.base import AuditTable


class UserOrganization(AuditTable, table=True):
    """Persist the authoritative Organization role assigned to one LongLink Platform user."""

    __tablename__: ClassVar[str] = "user_organizations"

    # Identifier
    user_id: UUID = Field(primary_key=True, foreign_key="users.id")
    organization_id: UUID = Field(primary_key=True, foreign_key="organizations.id", ondelete="CASCADE")

    # State
    role: OrganizationRoles = Field(
        sa_column=Column(Enum(OrganizationRoles, name="organization_role_enum", native_enum=False), nullable=False)
    )

    # Relationships
    user: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "UserOrganization.user_id"},
    )
    organization: "Organization" = Relationship(sa_relationship_kwargs={"foreign_keys": "UserOrganization.organization_id"})
