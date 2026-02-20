'''add envs table

Revision ID: 20260220_01
Revises: 20260219_02
Create Date: 2026-02-20 00:10:00.000000
'''

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260220_01'
down_revision: Union[str, None] = '20260219_02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'envs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('key', sa.String(length=128), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.Column('app_id', sa.Integer(), nullable=False),
        sa.Column('date_creation', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['app_id'], ['apps.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('app_id', 'key', name='uq_envs_app_id_key'),
    )


def downgrade() -> None:
    op.drop_table('envs')
