from typing import Optional
from datetime import datetime
from sqlmodel import Field, Session, SQLModel, create_engine

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, echo=False)


class Table(SQLModel):
    """Base SQLModel for DB tables with common timestamp fields."""

    created_at: Optional[datetime] = Field(default=None, nullable=True)
    updated_at: Optional[datetime] = Field(default=None, nullable=True)


# Keep backward-compatible alias for code still importing `Base`.
Base = Table


def get_session() -> Session:
    """Create DB session bound to SDK engine."""
    return Session(engine)
