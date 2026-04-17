from sqlalchemy import Text, String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base, AuditMixin


class Setting(Base, AuditMixin):
    '''Represent a platform setting at org or app scope.'''
    __tablename__ = 'settings'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Propriety
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    appid: Mapped[str | None] = mapped_column(ForeignKey('apps.id', ondelete='CASCADE'), nullable=True)
