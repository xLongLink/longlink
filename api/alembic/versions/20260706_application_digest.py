import sqlalchemy as sa
from alembic import op

revision = "20260706_application_digest"
down_revision = "20260702_operation_scheduling"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Track immutable application image digests and SDK versions."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}

    with op.batch_alter_table("applications") as batch_op:
        if "sdk" not in existing_columns:
            batch_op.add_column(sa.Column("sdk", sa.String(length=128), nullable=True))
        if "digest" not in existing_columns:
            batch_op.add_column(sa.Column("digest", sa.String(length=255), nullable=True))

        batch_op.alter_column(
            "version",
            existing_type=sa.String(length=20),
            type_=sa.String(length=128),
            existing_nullable=True,
        )

    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}

    # Preserve values from earlier column names before dropping them.
    if "sdk" in existing_columns and "sdk_version" in existing_columns:
        op.execute(sa.text("UPDATE applications SET sdk = sdk_version WHERE sdk IS NULL"))
    if "digest" in existing_columns and "image_digest" in existing_columns:
        op.execute(sa.text("UPDATE applications SET digest = image_digest WHERE digest IS NULL"))

    with op.batch_alter_table("applications") as batch_op:
        if "sdk_version" in existing_columns:
            batch_op.drop_column("sdk_version")
        if "image_digest" in existing_columns:
            batch_op.drop_column("image_digest")


def downgrade() -> None:
    """Restore pre-digest application image metadata columns."""

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}

    with op.batch_alter_table("applications") as batch_op:
        if "sdk_version" not in existing_columns:
            batch_op.add_column(sa.Column("sdk_version", sa.String(length=20), nullable=True))

        batch_op.alter_column(
            "version",
            existing_type=sa.String(length=128),
            type_=sa.String(length=20),
            existing_nullable=True,
        )

    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("applications")}

    if "sdk" in existing_columns and "sdk_version" in existing_columns:
        op.execute(sa.text("UPDATE applications SET sdk_version = sdk WHERE sdk_version IS NULL"))

    with op.batch_alter_table("applications") as batch_op:
        if "sdk" in existing_columns:
            batch_op.drop_column("sdk")
        if "digest" in existing_columns:
            batch_op.drop_column("digest")
