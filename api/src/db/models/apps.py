from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class App(Base):
    """Represent an application installed in an organization."""

    __tablename__ = 'apps'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_org: Mapped[int] = mapped_column(Integer, ForeignKey('organizations.id'), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
