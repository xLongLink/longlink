from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base, AuditMixin


class User(Base, AuditMixin):
    '''Represent a user account authenticated via OIDC.'''

    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    oidc_subject: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
