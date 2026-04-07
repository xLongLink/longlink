from datetime import datetime
from sqlalchemy import String, Boolean, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class ComputeConnection(Base):
    '''Represent external Kubernetes admin credentials managed by the control panel.'''

    __tablename__ = 'compute_connections'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    api_server_url: Mapped[str] = mapped_column(String(512), nullable=False)
    admin_username: Mapped[str] = mapped_column(String(255), nullable=False)
    admin_password: Mapped[str] = mapped_column(String(255), nullable=False)
    default_namespace: Mapped[str] = mapped_column(String(63), nullable=False, default='default')
    verify_ssl: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    date_update: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
