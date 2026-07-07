# Revision ID: ${up_revision}
# Revises: ${down_revision | comma,n}
# Create Date: ${create_date}
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision = "${up_revision}"
down_revision = ${repr(down_revision)}
branch_labels = None
depends_on = None


def upgrade():
    """Apply this migration."""

    ${upgrades if upgrades else "pass"}


def downgrade():
    """Revert this migration."""

    ${downgrades if downgrades else "pass"}
