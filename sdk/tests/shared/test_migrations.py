import pytest
from uuid import UUID, uuid4
from datetime import UTC, datetime
from sqlalchemy import text
from longlink.shared import users as shared_users
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import create_async_engine
from longlink.shared.migrations import migrate_database, alembic_script_location


def test_alembic_script_location_returns_sdk_owned_migrations() -> None:
    """Locate the shared-schema Alembic directory from the SDK package."""

    # Resolve the migration package used by the public entrypoint.
    script_location = alembic_script_location()

    assert script_location.name == "alembic"
    assert (script_location / "env.py").exists()
    assert any(path.suffix == ".py" and path.name != "__init__.py" for path in (script_location / "versions").iterdir())


@pytest.mark.integration
async def test_shared_migrations_and_user_sync_use_postgresql_shared_schema(postgresql_url: URL) -> None:
    """Migrate and synchronize shared users against an isolated PostgreSQL database."""

    # Make an application schema the role default to prove migrations override it.
    setup_engine = create_async_engine(postgresql_url)
    try:
        async with setup_engine.begin() as connection:
            await connection.execute(text("CREATE SCHEMA application"))
            await connection.execute(
                text(f"ALTER ROLE {postgresql_url.username} IN DATABASE {postgresql_url.database} SET search_path = application, public")
            )
    finally:
        await setup_engine.dispose()

    # Exercise migration idempotency through the SDK-owned async entrypoint.
    await migrate_database(postgresql_url)
    await migrate_database(postgresql_url)

    # Verify both SDK-owned tables exist only in the shared schema.
    engine = create_async_engine(postgresql_url)
    try:
        async with engine.begin() as connection:
            table_locations = set(
                (
                    await connection.execute(
                        text(
                            """
                            SELECT table_schema, table_name
                            FROM information_schema.tables
                            WHERE table_name IN ('users', 'alembic_version')
                            """
                        )
                    )
                ).tuples()
            )
            await connection.execute(
                text(f"ALTER ROLE {postgresql_url.username} IN DATABASE {postgresql_url.database} SET search_path = shared")
            )
    finally:
        await engine.dispose()

    assert table_locations == {("shared", "users"), ("shared", "alembic_version")}

    # Insert one active control-plane user through the public synchronization entrypoint.
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    created_at = datetime(2026, 7, 6, 8, tzinfo=UTC)
    active_user: shared_users.UserRow = {
        "id": user_id,
        "name": "Owner User",
        "email": "owner@example.com",
        "avatar": "",
        "role": "owner",
        "created_at": created_at,
        "updated_at": created_at,
        "deleted_at": None,
    }
    await shared_users.sync_url(postgresql_url, [active_user])

    # Upsert changed mutable fields and an explicit control-plane deactivation.
    deactivated_at = datetime(2026, 7, 7, 9, tzinfo=UTC)
    deactivated_user: shared_users.UserRow = {
        **active_user,
        "name": "Updated User",
        "email": "updated@example.com",
        "avatar": "https://example.com/avatar.png",
        "role": "read",
        "created_at": datetime(2026, 7, 7, 8, tzinfo=UTC),
        "updated_at": deactivated_at,
        "deleted_at": deactivated_at,
    }
    await shared_users.sync_url(postgresql_url, [deactivated_user])

    # Repeat the same synchronization payload to prove row-level idempotency.
    await shared_users.sync_url(postgresql_url, [deactivated_user])

    # Read the persisted row from its qualified shared table and verify no duplicate was created.
    verification_engine = create_async_engine(postgresql_url)
    try:
        async with verification_engine.connect() as connection:
            rows = (
                (
                    await connection.execute(
                        text(
                            """
                        SELECT id, name, email, avatar, role, created_at, updated_at, deleted_at
                        FROM shared.users
                        WHERE id = :user_id
                        """
                        ),
                        {"user_id": user_id},
                    )
                )
                .mappings()
                .all()
            )
    finally:
        await verification_engine.dispose()

    assert len(rows) == 1
    assert dict(rows[0]) == {
        "id": user_id,
        "name": "Updated User",
        "email": "updated@example.com",
        "avatar": "https://example.com/avatar.png",
        "role": "read",
        "created_at": created_at,
        "updated_at": deactivated_at,
        "deleted_at": deactivated_at,
    }
