"""Allow duplicate application names across organizations.

Revision ID: 20260623_application_name_not_unique
Revises: 20260623_app_version_labels
Create Date: 2026-06-23 00:00:00.000000
"""

from alembic import op

revision = "20260623_application_name_not_unique"
down_revision = "20260623_app_version_labels"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Drop the global application-name uniqueness constraint."""

    with op.batch_alter_table("applications") as batch_op:
        batch_op.drop_constraint("applications_name_key", type_="unique")


def downgrade() -> None:
    """Restore the global application-name uniqueness constraint."""

    with op.batch_alter_table("applications") as batch_op:
        batch_op.create_unique_constraint("applications_name_key", ["name"])
