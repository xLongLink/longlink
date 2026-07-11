import sqlalchemy as sa
from alembic import op

revision = "20260711_drop_application_gateway_url"
down_revision = "20260711_application_gateway_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove denormalized application gateway URLs."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}

    # Older databases may never have received the temporary gateway URL column.
    if "gateway_url" not in existing_columns:
        return

    # Gateway targets are now derived from the assigned compute registry.
    with op.batch_alter_table("applications") as batch_op:
        batch_op.drop_column("gateway_url")


def downgrade() -> None:
    """Restore denormalized application gateway URLs."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}

    # Downgrades only need to restore the nullable column shape.
    if "gateway_url" in existing_columns:
        return

    with op.batch_alter_table("applications") as batch_op:
        batch_op.add_column(sa.Column("gateway_url", sa.String(length=512), nullable=True))
