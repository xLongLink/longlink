import pytest
from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import text
from longlink.shared import audit as shared_audit
from sqlalchemy.engine import URL
from longlink.shared.models import Audit
from sqlalchemy.ext.asyncio import create_async_engine
from longlink.shared.migrations import migrate_database


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
                            WHERE table_name IN ('audit', 'alembic_version')
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

    assert table_locations == {("shared", "audit"), ("shared", "alembic_version")}

    # Insert one active control-plane user through the public synchronization entrypoint.
    user_id = UUID("00000000-0000-0000-0000-000000000001")
    created_at = datetime(2026, 7, 6, 8, tzinfo=UTC)
    active_user = Audit(
        id=user_id,
        name="Owner User",
        email="owner@example.com",
        avatar="",
        role="owner",
        created_at=created_at,
        updated_at=created_at,
    )
    await shared_audit.sync(postgresql_url, [active_user])

    # Upsert changed mutable fields and an explicit control-plane deactivation.
    deactivated_at = datetime(2026, 7, 7, 9, tzinfo=UTC)
    deactivated_user = active_user.model_copy(
        update={
            "name": "Updated User",
            "email": "updated@example.com",
            "avatar": "https://example.com/avatar.png",
            "role": "read",
            "created_at": datetime(2026, 7, 7, 8, tzinfo=UTC),
            "updated_at": deactivated_at,
            "deleted_at": deactivated_at,
        }
    )
    await shared_audit.sync(postgresql_url, [deactivated_user])

    # Read the persisted row from its qualified shared table and verify no duplicate was created.
    verification_engine = create_async_engine(postgresql_url)
    try:
        async with verification_engine.connect() as connection:
            result = await connection.execute(
                text(
                    """
                    SELECT id, name, email, avatar, role, created_at, updated_at, deleted_at
                    FROM shared.audit
                    WHERE id = :user_id
                    """
                ),
                {"user_id": user_id},
            )
            row = result.mappings().one()
    finally:
        await verification_engine.dispose()

    assert dict(row) == {
        "id": user_id,
        "name": "Updated User",
        "email": "updated@example.com",
        "avatar": "https://example.com/avatar.png",
        "role": "read",
        "created_at": created_at,
        "updated_at": deactivated_at,
        "deleted_at": deactivated_at,
    }
