import uuid
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base, AuditMixin


class App(Base, AuditMixin):
    '''Represent an application installed in the platform.'''
    __tablename__ = 'apps'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    url: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    key: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False, default='tool')
