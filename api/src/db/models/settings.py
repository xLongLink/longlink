from datetime import datetime
from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class Setting(Base):
    '''Represent a platform setting at org or app scope.'''

    __tablename__ = 'settings'
    __table_args__ = (
        CheckConstraint("scope IN ('org', 'app')", name='ck_settings_scope'),
        CheckConstraint(
            "(scope = 'org' AND app_id IS NULL) OR (scope = 'app' AND app_id IS NOT NULL)",
            name='ck_settings_scope_app_id',
        ),
        Index('uq_settings_scope_key_app_id_norm', 'scope', 'key', text('coalesce(app_id, 0)'), unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(16), nullable=False)
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    app_id: Mapped[int | None] = mapped_column(ForeignKey('apps.id', ondelete='CASCADE'), nullable=True)

    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
