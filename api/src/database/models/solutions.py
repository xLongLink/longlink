from uuid import UUID, uuid4
from typing import TYPE_CHECKING, Literal, ClassVar
from datetime import datetime
from sqlmodel import Field, Relationship
from sqlalchemy import Enum, Column, Integer, CheckConstraint, UniqueConstraint, ForeignKeyConstraint, event, inspect
from sqlalchemy.orm import Mapper
from src.environments import env
from sqlalchemy.engine import Connection
from src.database.types import EncryptedType
from longlink.utils.time import utcnow
from src.models.statuses import Status
from longlink.database.types import UTCDateTime
from src.database.models.base import PlatformModel

# Import relationship targets only during type checking.
if TYPE_CHECKING:
    from src.database.models.organizations import Organization


class Solution(PlatformModel, table=True):
    """Persist desired and observed runtime state for one Organization-owned LongLink Solution.

    A deletion tombstone remains until reconciliation removes the Solution's external resources.
    """

    __tablename__: ClassVar[str] = "solutions"
    __table_args__ = (
        UniqueConstraint("organization_id", "slug"),
        ForeignKeyConstraint(
            ["id", "desired_revision_id"], ["revisions.solution_id", "revisions.id"], name="solution_desired_revision", use_alter=True
        ),
        ForeignKeyConstraint(
            ["id", "deployed_revision_id"], ["revisions.solution_id", "revisions.id"], name="solution_deployed_revision", use_alter=True
        ),
    )

    # Identifier
    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Organization
    organization_id: UUID = Field(foreign_key="organizations.id", ondelete="CASCADE")

    # Metadata
    name: str = Field(max_length=100)
    slug: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=255)

    # Desired release
    desired_revision_id: UUID | None = Field(default=None)
    deployed_revision_id: UUID | None = Field(default=None)

    # Secrets
    secrets: dict[str, str] = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))

    # State
    status: Status = Field(
        default=Status.creating,
        sa_column=Column(
            Enum(Status, name="solution_status_enum", native_enum=False, create_constraint=True, validate_strings=True),
            nullable=False,
        ),
    )

    # Audit
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    created_id: UUID | None = Field(default=None, foreign_key="users.id")
    updated_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime, sa_column_kwargs={"onupdate": utcnow})
    updated_id: UUID | None = Field(default=None, foreign_key="users.id")
    deleted_at: datetime | None = Field(default=None, sa_type=UTCDateTime)
    deleted_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Relationships
    organization: "Organization" = Relationship()
    desired_revision: "Revision" = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "Solution.desired_revision_id == Revision.id",
            "foreign_keys": "Solution.desired_revision_id",
            "lazy": "selectin",
        }
    )

    @property
    def image_desired(self) -> str:
        """Expose the desired snapshot image without duplicating persisted state."""

        return self.desired_revision.image

    @property
    def min_scale(self) -> Literal[0, 1]:
        """Expose the desired snapshot's minimum running instance count."""

        return self.desired_revision.min_scale

    @property
    def effective_revision_id(self) -> UUID | None:
        """Select desired state, falling back to the last deployed release after failure."""

        if self.desired_revision is None or self.desired_revision.failed:
            return self.deployed_revision_id
        return self.desired_revision_id

    @property
    def deployment_pending(self) -> bool:
        """Include queued new revisions before a worker marks the runtime creating."""

        return self.desired_revision_id != self.deployed_revision_id and not self.desired_revision.failed


class Revision(PlatformModel, table=True):
    """Retain an immutable release snapshot and its observed deployment outcome."""

    __tablename__: ClassVar[str] = "revisions"
    __table_args__ = (UniqueConstraint("solution_id", "id"), CheckConstraint("min_scale IN (0, 1)", name="revision_min_scale"))

    # Snapshot
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    solution_id: UUID = Field(foreign_key="solutions.id", ondelete="CASCADE")
    image: str = Field(max_length=512)
    source: str = Field(max_length=512)
    min_scale: Literal[0, 1] = Field(default=0, sa_column=Column(Integer, nullable=False, server_default="0"))
    envs: dict[str, str] = Field(sa_column=Column(EncryptedType(env.ENCRYPTION_KEY), nullable=False))
    created_at: datetime = Field(default_factory=utcnow, sa_type=UTCDateTime)
    created_id: UUID | None = Field(default=None, foreign_key="users.id")

    # Observed state does not modify the snapshot.
    failed: bool = Field(default=False)
    deployed_at: datetime | None = Field(default=None, sa_type=UTCDateTime)

    @property
    def configured_envs(self) -> list[str]:
        """Expose configured names without returning their encrypted values."""

        return sorted(self.envs)


@event.listens_for(Revision, "before_update")
def protect_snapshot(_mapper: Mapper[Revision], _connection: Connection, revision: Revision) -> None:
    """Reject edits to persisted snapshot fields while allowing observed outcomes."""

    # Release configuration and ownership are append-only.
    state = inspect(revision)
    if any(
        state.attrs[name].history.has_changes()
        for name in ("id", "solution_id", "source", "image", "envs", "min_scale", "created_at", "created_id")
    ):
        raise ValueError("Revision snapshots are immutable")
