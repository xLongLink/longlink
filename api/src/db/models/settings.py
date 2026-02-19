from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class Setting(Base):
    '''Represent a platform setting at org or app scope.'''
    __tablename__ = 'settings'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Propriety
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    app_id: Mapped[int | None] = mapped_column(ForeignKey('apps.id', ondelete='CASCADE'), nullable=True)

    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
