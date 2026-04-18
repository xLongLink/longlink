from typing import Iterator, Optional
from datetime import datetime
from sqlmodel import Field, Session, SQLModel
from sqlalchemy import create_engine as create_sqlalchemy_engine
from sqlalchemy.engine import Engine
from longlink.utils.settings import Settings


class Table(SQLModel):
    """Base SQLModel for DB tables with common timestamp fields."""

    created_at: Optional[datetime] = Field(default=None, nullable=True)
    updated_at: Optional[datetime] = Field(default=None, nullable=True)


def create_engine(env: Settings) -> Engine:
    """Create SQLAlchemy engine from database URL."""
    return create_sqlalchemy_engine(env.DBURL)


def get_session(engine: Engine) -> Iterator[Session]:
    """Yield SQLModel session bound to engine."""

    with Session(engine) as session:
        yield session
