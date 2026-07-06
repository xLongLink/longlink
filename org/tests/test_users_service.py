from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy.dialects import postgresql
from tenant.models import User
from tenant.database.services.users import users


class FakeConnection:
    """Minimal async connection for tenant user service tests."""

    def __init__(self) -> None:
        """Initialize an empty statement log."""

        self.calls: list[tuple[object, object | None]] = []


    async def execute(self, statement: object, params: object | None = None) -> None:
        """Record SQLAlchemy statements and parameters."""

        self.calls.append((statement, params))


def compiled_sql(statement: object) -> str:
    """Compile a SQLAlchemy statement using the PostgreSQL dialect."""

    return str(statement.compile(dialect=postgresql.dialect()))


async def test_sync_upserts_active_users_and_soft_deletes_stale_rows() -> None:
    """Synchronize active tenant users into the shared users table."""

    # Arrange
    connection = FakeConnection()
    timestamp = datetime(2026, 7, 6, tzinfo=UTC)
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    active_user = User(
        id=user_id,
        name="Owner User",
        email="owner@example.com",
        avatar="",
        role_name="owner",
        created_at=timestamp,
        updated_at=timestamp,
    )

    # Act
    await users.sync(connection, [active_user])

    # Assert
    assert len(connection.calls) == 2
    insert_statement, insert_params = connection.calls[0]
    update_statement, update_params = connection.calls[1]
    assert "INSERT INTO shared.users" in compiled_sql(insert_statement)
    assert "ON CONFLICT" in compiled_sql(insert_statement)
    assert insert_params == [active_user.model_dump()]
    assert "UPDATE shared.users" in compiled_sql(update_statement)
    assert update_params is None


async def test_sync_soft_deletes_all_users_when_no_active_users_remain() -> None:
    """Soft-delete every shared user when the active user list is empty."""

    # Arrange
    connection = FakeConnection()

    # Act
    await users.sync(connection, [])

    # Assert
    assert len(connection.calls) == 1
    statement, params = connection.calls[0]
    sql = compiled_sql(statement)
    assert "UPDATE shared.users" in sql
    assert "id NOT IN" not in sql
    assert params is None
