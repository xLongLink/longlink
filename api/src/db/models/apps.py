from datetime import datetime
from src.db.models.__base__ import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, BigInteger, ForeignKey, func


class App(Base):
    """Represent an application installed in an organization."""

    __tablename__ = 'apps'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_org: Mapped[int] = mapped_column(BigInteger, ForeignKey('organizations.id'), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    date_creation: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
