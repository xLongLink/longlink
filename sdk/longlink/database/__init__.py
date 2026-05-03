from .base import Table, get_session
from sqlmodel import SQLModel


class Database:
    """Placeholder DB facade for SDK public API."""

    Table = Table

    @staticmethod
    async def get_session():
        """Return the configured async session factory."""

        return await get_session()


Base = SQLModel
db = Database()


__all__ = ["Base", "Database", "Table", "db", "get_session"]
