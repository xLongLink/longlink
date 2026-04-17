import pytest
from src.utils import database
from unittest.mock import Mock


@pytest.mark.unit
def test_create_sync_raises_when_database_already_exists(monkeypatch):
    """Database helper should prevent creating duplicate databases."""
    fake_cursor = Mock()
    fake_cursor.fetchone.return_value = (1,)

    class _CursorContext:
        def __enter__(self):
            """Return fake cursor when context starts."""
            return fake_cursor

        def __exit__(self, exc_type, exc, tb):
            """Do not suppress errors raised in context."""
            return False

    fake_connection = Mock()
    fake_connection.cursor.return_value = _CursorContext()

    def _connect_stub(**kwargs):
        """Return fake admin connection for database helper call."""
        return fake_connection

    monkeypatch.setattr(database.psycopg2, "connect", _connect_stub)

    with pytest.raises(ValueError, match="already exists"):
        database._create_sync("existing_db")

    fake_connection.close.assert_called_once()
    fake_cursor.execute.assert_called_once_with(
        "SELECT 1 FROM pg_database WHERE datname = %s", ("existing_db",)
    )
