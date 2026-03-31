import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class Permission(Base):
    '''Represent the access level granted to one user for one app.'''
    __tablename__ = 'permissions'
    __table_args__ = (
        UniqueConstraint('user_id', 'app_id', name='uq_permissions_user_app'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    app_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    level: Mapped[str] = mapped_column(String(16), nullable=False)

    # Timestamp informations
    date_update: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
