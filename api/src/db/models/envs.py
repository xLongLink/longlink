from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class Env(Base):
    '''Represent an application secret environment variable.'''
    __tablename__ = 'envs'
    __table_args__ = (UniqueConstraint('app_id', 'key', name='uq_envs_app_id_key'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    app_id: Mapped[int] = mapped_column(ForeignKey('apps.id', ondelete='CASCADE'), nullable=False)

    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
