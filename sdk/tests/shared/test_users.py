from uuid import UUID
from typing import Any, Protocol, cast
from datetime import UTC, datetime
from longlink import User as PublicUser
from longlink.shared import User
from longlink.shared import users as shared_users
from sqlalchemy.dialects import postgresql
from longlink.shared.models import shared_users_table
from sqlalchemy.ext.asyncio import AsyncConnection
from longlink.shared.constants import SHARED_USERS_TABLE


class CompilableStatement(Protocol):
    """Represent the SQLAlchemy statements inspected by these tests."""

    def compile(self, *args: Any, **kwargs: Any) -> object:
        """Compile the statement for one SQL dialect."""
        ...


class FakeConnection:
    """Minimal async connection for shared user synchronization tests."""

    def __init__(self) -> None:
        """Initialize an empty statement log."""

        self.calls: list[tuple[CompilableStatement, object | None]] = []

    async def execute(self, statement: CompilableStatement, params: object | None = None) -> None:
        """Record SQLAlchemy statements and parameters."""

        self.calls.append((statement, params))


def compiled_sql(statement: CompilableStatement) -> str:
    """Compile a SQLAlchemy statement using the PostgreSQL dialect."""

    return str(statement.compile(dialect=postgresql.dialect()))


def test_shared_user_has_one_sdk_table_mapping() -> None:
    """Use one SDK model for shared migrations and application reads."""

    assert User is PublicUser
    assert shared_users_table is getattr(User, "__table__")
    assert shared_users_table.name == SHARED_USERS_TABLE
    assert {"id", "name", "email", "avatar", "role", "created_at", "updated_at", "deleted_at"} <= set(
        shared_users_table.c.keys()
    )


async def test_sync_upserts_user_state_from_control_plane_rows() -> None:
    """Synchronize shared users from control-plane row mappings."""

    connection = FakeConnection()
    timestamp = datetime(2026, 7, 6, tzinfo=UTC)
    active_user: shared_users.UserRow = {
        "id": UUID("00000000-0000-0000-0000-000000000001"),
        "name": "Owner User",
        "email": "owner@example.com",
        "avatar": "",
        "role": "owner",
        "created_at": timestamp,
        "updated_at": timestamp,
        "deleted_at": None,
    }

    await shared_users.sync(cast(AsyncConnection, connection), [active_user])

    assert len(connection.calls) == 1
    insert_statement, insert_params = connection.calls[0]
    sql = compiled_sql(insert_statement)
    assert "INSERT INTO users" in sql
    assert "ON CONFLICT" in sql
    assert "created_at = excluded.created_at" not in sql
    assert "deleted_at = excluded.deleted_at" in sql
    assert insert_params == [active_user]


async def test_sync_does_not_infer_deactivation_from_an_empty_payload() -> None:
    """Do nothing when the control plane sends no shared user rows."""

    connection = FakeConnection()

    await shared_users.sync(cast(AsyncConnection, connection), [])

    assert connection.calls == []
