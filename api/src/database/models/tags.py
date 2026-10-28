from uuid import UUID, uuid4
from typing import ClassVar
from sqlmodel import Field
from sqlalchemy import Enum, Index, Column, Integer, UniqueConstraint, ForeignKeyConstraint
from src.models.tags import TagIcon, TagKind
from src.database.models.base import PlatformModel


class OrganizationTag(PlatformModel, table=True):
    """Name one shared Solution category within an Organization."""

    __tablename__: ClassVar[str] = "organization_tags"
    __table_args__ = (UniqueConstraint("organization_id", "name"), UniqueConstraint("organization_id", "id"))

    # Identity and ownership
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(foreign_key="organizations.id", ondelete="CASCADE", index=True)

    # Metadata
    name: str = Field(max_length=64)
    icon: TagIcon = Field(
        default=TagIcon.tag,
        sa_column=Column(
            Enum(
                TagIcon,
                name="tag_icon_enum",
                native_enum=False,
                create_constraint=True,
                validate_strings=True,
                # Persist public icon values rather than Python enum member names.
                values_callable=lambda icons: [icon.value for icon in icons],
            ),
            nullable=False,
            server_default="tag",
        ),
    )

    # Navigation order
    position: int = Field(default=0, ge=0, sa_column=Column(Integer, nullable=False, server_default="0"))

    # Filtering
    kind: TagKind = Field(
        default=TagKind.tag,
        sa_column=Column(
            Enum(TagKind, name="tag_kind_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
            server_default="tag",
        ),
    )


class SolutionTag(PlatformModel, table=True):
    """Assign a tag only to a Solution in the same Organization."""

    # Composite references enforce the assignment's tenant boundary.
    __tablename__: ClassVar[str] = "solution_tags"
    __table_args__ = (
        Index("ix_solution_tags_organization_solution", "organization_id", "solution_id"),
        Index("ix_solution_tags_organization_tag", "organization_id", "tag_id"),
        ForeignKeyConstraint(["organization_id", "solution_id"], ["solutions.organization_id", "solutions.id"], ondelete="CASCADE"),
        ForeignKeyConstraint(
            ["organization_id", "tag_id"], ["organization_tags.organization_id", "organization_tags.id"], ondelete="CASCADE"
        ),
    )

    # Assignment
    tag_id: UUID = Field(primary_key=True)
    solution_id: UUID = Field(primary_key=True)
    organization_id: UUID
