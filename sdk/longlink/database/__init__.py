from .base import User, Table, get_session, create_engine
from longlink.utils.settings import Envs

__all__ = ["Database", "Table", "User", "create_db", "create_engine", "get_session"]


class Database:
    """Placeholder DB facade for SDK public API."""

    Table = Table

    @staticmethod
    async def get_session():
        """Return the configured async session factory."""

        return await get_session()


def create_db(env: Envs):
    """Create the database facade for the current environment."""

    create_engine(env)
    return Database()
