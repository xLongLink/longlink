"""Set the default location country to CH.

Revision ID: 20260611_set_location_country_default_ch
Revises: 20260610_require_org_location
Create Date: 2026-06-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260611_set_location_country_default_ch"
down_revision = "20260610_require_org_location"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Backfill the country default and narrow the stored code length."""

    op.execute(sa.text("UPDATE locations SET country = 'CH' WHERE country = ''"))

    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column(
            "country",
            existing_type=sa.String(length=128),
            type_=sa.String(length=2),
            existing_nullable=False,
            server_default=sa.text("'CH'"),
        )


def downgrade() -> None:
    """Restore the previous blank default and wider storage length."""

    op.execute(sa.text("UPDATE locations SET country = '' WHERE country = 'CH'"))

    with op.batch_alter_table("locations") as batch_op:
        batch_op.alter_column(
            "country",
            existing_type=sa.String(length=2),
            type_=sa.String(length=128),
            existing_nullable=False,
            server_default=sa.text("''"),
        )
