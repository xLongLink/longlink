from datetime import datetime
from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base


class App(Base):
    """Represent an application installed in the platform."""

    __tablename__ = 'apps'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)

    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
