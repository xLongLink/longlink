import sqlalchemy as sa
from alembic import op

revision = "20260712_organization_shared_schema_url"
down_revision = "20260712_drop_derived_storage_names"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Store the tenant shared-schema URL on organizations."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("organizations")}

    with op.batch_alter_table("organizations") as batch_op:
        if "shared_schema_url" not in columns:
            batch_op.add_column(sa.Column("shared_schema_url", sa.String(length=2048), nullable=True))


def downgrade() -> None:
    """Remove the tenant shared-schema URL from organizations."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("organizations")}

    with op.batch_alter_table("organizations") as batch_op:
        if "shared_schema_url" in columns:
            batch_op.drop_column("shared_schema_url")
