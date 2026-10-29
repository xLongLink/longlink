"""Add revision catalogs and scoped member permissions."""

import sqlalchemy as sa
from alembic import op
from sqlmodel.sql.sqltypes import UTCDateTime

revision = "20261029_0012"
down_revision = "20261022_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Persist endpoint defaults and member assignments."""

    # Catalogs and assignments retain the same audit attribution as other Platform records.
    for table, columns, constraints in (
        (
            "permission_catalogs",
            [
                sa.Column("revision_id", sa.Uuid(), sa.ForeignKey("revisions.id", ondelete="CASCADE"), primary_key=True),
                sa.Column("catalog", sa.JSON(), nullable=False),
            ],
            [],
        ),
        (
            "solution_member_access",
            [
                sa.Column("user_id", sa.Uuid(), primary_key=True),
                sa.Column("solution_id", sa.Uuid(), primary_key=True),
                sa.Column("organization_id", sa.Uuid(), nullable=False),
                sa.Column("role", sa.String(64), nullable=True),
            ],
            [
                sa.ForeignKeyConstraint(
                    ["organization_id", "solution_id"], ["solutions.organization_id", "solutions.id"], ondelete="CASCADE"
                ),
                sa.ForeignKeyConstraint(
                    ["user_id", "organization_id"], ["user_organizations.user_id", "user_organizations.organization_id"], ondelete="CASCADE"
                ),
            ],
        ),
    ):
        op.create_table(
            table,
            *columns,
            *constraints,
            sa.Column("created_at", UTCDateTime(), nullable=False),
            sa.Column("updated_at", UTCDateTime(), nullable=False),
            sa.Column("deleted_at", UTCDateTime(), nullable=True),
            sa.Column("created_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("updated_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
            sa.Column("deleted_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        )


def downgrade() -> None:
    """Require explicit restoration rather than silently removing authorization enforcement."""

    raise NotImplementedError("Restore a backup to downgrade endpoint permissions")
