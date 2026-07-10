from .base import User, Table, create_engine
from .base import get_session as create_session
from .base import get_session_maker as create_session_maker
from longlink.utils.settings import Envs

get_session = create_session
get_session_maker = create_session_maker


class Database:
    """Placeholder DB facade for SDK public API."""

    Table = Table

    @staticmethod
    def get_session():
        """Return an async context manager for one database session."""

        return create_session()

    @staticmethod
    async def get_session_maker():
        """Return the configured async session factory."""

        return await create_session_maker()


def create_db(env: Envs):
    """Create the database facade for the current environment."""

    create_engine(env)
    return Database()
