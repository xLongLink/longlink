from datetime import datetime
from sqlalchemy import JSON, String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class Storage(Base):
    '''Represent a root storage connection used by the control panel.'''
    __tablename__ = 'storages'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    base_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    options: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False, default=dict)

    # Timestamp informations
    date_update: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
