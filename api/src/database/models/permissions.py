from uuid import UUID
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import JSON, Column, ForeignKeyConstraint
from src.database.models.base import AuditTable


class PermissionCatalog(AuditTable, table=True):
    """Retain observed defaults for one exact deployed Solution revision."""

    __tablename__: ClassVar[str] = "permission_catalogs"

    # Revision identity and validated SDK manifest.
    revision_id: UUID = Field(primary_key=True, foreign_key="revisions.id", ondelete="CASCADE")
    catalog: dict[str, object] = Field(sa_column=Column(JSON, nullable=False))


class SolutionMemberAccess(AuditTable, table=True):
    """Assign SDK-defined Solution roles to Organization members."""

    __tablename__: ClassVar[str] = "solution_member_access"
    __table_args__ = (
        ForeignKeyConstraint(["organization_id", "solution_id"], ["solutions.organization_id", "solutions.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(
            ["user_id", "organization_id"], ["user_organizations.user_id", "user_organizations.organization_id"], ondelete="CASCADE"
        ),
    )

    # Tenant and member identity.
    user_id: UUID = Field(primary_key=True)
    solution_id: UUID = Field(primary_key=True)
    organization_id: UUID

    # A missing role disables Solution access.
    role: str | None = Field(default=None, max_length=64)
