from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class StorageConnection(Base):
    '''Represent external S3-compatible admin credentials managed by the control panel.'''

    __tablename__ = 'storage_connections'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    endpoint_url: Mapped[str] = mapped_column(String(512), nullable=False)
    access_key_id: Mapped[str] = mapped_column(String(255), nullable=False)
    secret_access_key: Mapped[str] = mapped_column(String(255), nullable=False)
    region_name: Mapped[str | None] = mapped_column(String(64), nullable=True)

    date_update: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
