'''add settings table

Revision ID: 20260219_01
Revises:
Create Date: 2026-02-19 00:00:00.000000
'''

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260219_01'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'settings',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('scope', sa.String(length=16), nullable=False),
        sa.Column('key', sa.String(length=128), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('app_id', sa.Integer(), nullable=True),
        sa.Column('date_creation', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.CheckConstraint("scope IN ('org', 'app')", name='ck_settings_scope'),
        sa.CheckConstraint(
            "(scope = 'org' AND app_id IS NULL) OR (scope = 'app' AND app_id IS NOT NULL)",
            name='ck_settings_scope_app_id',
        ),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'uq_settings_scope_key_app_id_norm',
        'settings',
        ['scope', 'key', sa.text('coalesce(app_id, 0)')],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index('uq_settings_scope_key_app_id_norm', table_name='settings')
    op.drop_table('settings')
