from .base import Table, get_session, initialize_database
from sqlmodel import SQLModel
from longlink.utils.settings import Environments


class Database:
    """Placeholder DB facade for SDK public API."""

    Table = Table

    @staticmethod
    async def get_session():
        """Return the configured async session factory."""

        return await get_session()


Base = SQLModel

# Initialize database engine at import time so apps get a ready-to-use DB facade.
_env = Environments()
_engine = initialize_database(_env)
db = Database()


__all__ = ["Base", "Database", "Table", "db", "get_session"]
