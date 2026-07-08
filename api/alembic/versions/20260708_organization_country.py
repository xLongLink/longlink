import sqlalchemy as sa
from alembic import op

revision = "20260708_organization_country"
down_revision = "20260707_storage_bucket_assignments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Store each organization's country."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    organization_columns = {column["name"] for column in inspector.get_columns("organizations")}

    with op.batch_alter_table("organizations") as batch_op:
        if "country" not in organization_columns:
            batch_op.add_column(sa.Column("country", sa.String(length=2), server_default=sa.text("'CH'"), nullable=False))


def downgrade() -> None:
    """Remove organization country storage."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    organization_columns = {column["name"] for column in inspector.get_columns("organizations")}

    with op.batch_alter_table("organizations") as batch_op:
        if "country" in organization_columns:
            batch_op.drop_column("country")
