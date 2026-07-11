from uuid import UUID
from typing import Any, Protocol, cast
from datetime import UTC, datetime
from tenant.models import User
from sqlalchemy.dialects import postgresql
from sqlalchemy.ext.asyncio import AsyncConnection
from tenant.database.services.users import users


class CompilableStatement(Protocol):
    """Represent the SQLAlchemy statements inspected by these tests."""

    def compile(self, *args: Any, **kwargs: Any) -> object:
        """Compile the statement for one SQL dialect."""
        ...


class FakeConnection:
    """Minimal async connection for tenant user service tests."""

    def __init__(self) -> None:
        """Initialize an empty statement log."""

        self.calls: list[tuple[CompilableStatement, object | None]] = []

    async def execute(self, statement: CompilableStatement, params: object | None = None) -> None:
        """Record SQLAlchemy statements and parameters."""

        self.calls.append((statement, params))


def compiled_sql(statement: CompilableStatement) -> str:
    """Compile a SQLAlchemy statement using the PostgreSQL dialect."""

    return str(statement.compile(dialect=postgresql.dialect()))


async def test_sync_upserts_user_state_from_payload() -> None:
    """Synchronize tenant users from the control-plane payload."""

    connection = FakeConnection()
    timestamp = datetime(2026, 7, 6, tzinfo=UTC)
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    active_user = User(
        id=user_id,
        name="Owner User",
        email="owner@example.com",
        avatar="",
        role="owner",
        created_at=timestamp,
        updated_at=timestamp,
    )

    await users.sync(cast(AsyncConnection, connection), [active_user])

    assert len(connection.calls) == 1
    insert_statement, insert_params = connection.calls[0]
    sql = compiled_sql(insert_statement)
    assert "INSERT INTO users" in sql
    assert "ON CONFLICT" in sql
    assert "created_at = excluded.created_at" not in sql
    assert "deleted_at = excluded.deleted_at" in sql
    assert insert_params == [active_user.model_dump()]


async def test_sync_does_not_infer_deactivation_from_an_empty_payload() -> None:
    """Do nothing when the control plane sends no user rows."""

    connection = FakeConnection()

    await users.sync(cast(AsyncConnection, connection), [])

    assert connection.calls == []
