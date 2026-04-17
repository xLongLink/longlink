from sqlalchemy import Text, String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from src.db.models.__base__ import Base, AuditMixin


class Env(Base, AuditMixin):
    '''Represent an application secret environment variable.
    Envs are stored as secrets and injected in the app container as environment variables.
    '''
    __tablename__ = 'envs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Propriety
    key: Mapped[str] = mapped_column(String(128), nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    appid: Mapped[str] = mapped_column(ForeignKey('apps.id', ondelete='CASCADE'), nullable=False)
