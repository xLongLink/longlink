from .base import User, Table
from .base import get_session
from .base import create_engine
from longlink.utils.settings import Envs


class Database:
    """Placeholder DB facade for SDK public API."""

    Table = Table

    @staticmethod
    def get_session():
        """Return an async context manager for one database session."""

        return get_session()


def create_db(env: Envs):
    """Create the database facade for the current environment."""

    create_engine(env)
    return Database()
