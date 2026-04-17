from typing import Any, Optional
from datetime import datetime
from sqlmodel import Field, Session, SQLModel


class Table(SQLModel):
    """Base SQLModel for DB tables with common timestamp fields."""

    created_at: Optional[datetime] = Field(default=None, nullable=True)
    updated_at: Optional[datetime] = Field(default=None, nullable=True)


def get_session(request: Any) -> Session:
    """Create DB session bound to SDK engine."""
    engine = request.app.state.engine
    return Session(engine)