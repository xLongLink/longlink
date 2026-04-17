from .base import Table, get_session
from sqlmodel import SQLModel


class Database:
    """Placeholder DB facade for SDK public API."""

    pass


Base = SQLModel


__all__ = ["Base", "Database", "Table", "get_session"]
