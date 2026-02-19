'''add app token hash

Revision ID: 20260219_02
Revises: 20260219_01
Create Date: 2026-02-19 00:10:00.000000
'''

import hashlib
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260219_02'
down_revision: Union[str, None] = '20260219_01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('apps', sa.Column('token_hash', sa.String(length=64), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(sa.text('SELECT id, url FROM apps')).fetchall()
    for row in rows:
        token_hash = hashlib.sha256(str(row.url).encode('utf-8')).hexdigest()
        connection.execute(
            sa.text('UPDATE apps SET token_hash = :token_hash WHERE id = :id'),
            {'id': row.id, 'token_hash': token_hash},
        )

    op.alter_column('apps', 'token_hash', nullable=False)
    op.create_unique_constraint('uq_apps_token_hash', 'apps', ['token_hash'])


def downgrade() -> None:
    op.drop_constraint('uq_apps_token_hash', 'apps', type_='unique')
    op.drop_column('apps', 'token_hash')
