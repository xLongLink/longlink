import pytest
from uuid import uuid4
from types import SimpleNamespace
from fastapi import HTTPException
from src.models.databases import DatabaseKind
from src.database.services import database, locations, applications, organizations
from src.database.models.users import User

db = SimpleNamespace(
    applications=applications,
    database=database,
    locations=locations,
    organizations=organizations,
)


async def test_create_get_and_fetch_all_return_active_database_registries(users: tuple[User, User, User]) -> None:
    """Persist a database registry and return it through read services."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")

    # Act
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
        "primary-database",
        "postgres.example",
        5432,
        "longlink",
        "secret",
        location.id,
        owner,
    )
    fetched = await db.database.fetch_all()
    reloaded = await db.database.get(registry.id)

    # Assert
    assert registry.kind == DatabaseKind.postgresql
    assert registry.name == "Primary database"
    assert registry.slug == "primary-database"
    assert registry.host == "postgres.example"
    assert registry.port == 5432
    assert registry.username == "longlink"
    assert registry.password == "secret"
    assert registry.location_id == location.id
    assert registry.created_by.id == owner.id
    assert registry.updated_by.id == owner.id
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.id == registry.id


async def test_create_rejects_duplicate_database_registry_names(users: tuple[User, User, User]) -> None:
    """Reject a second database registry with the same name."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
        "primary-database",
        "postgres.example",
        5432,
        "longlink",
        "secret",
        location.id,
        owner,
    )

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.database.create(
            DatabaseKind.postgresql,
            "Primary database",
            "primary-database",
            "other-postgres.example",
            5433,
            "other",
            "other-secret",
            location.id,
            owner,
        )

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Database registry already exists"


async def test_delete_soft_deletes_database_registry_and_include_deleted_can_reload_it(
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an unused database registry and hide it from active reads."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
        "primary-database",
        "postgres.example",
        5432,
        "longlink",
        "secret",
        location.id,
        owner,
    )

    # Act
    deleted = await db.database.delete(registry.id, owner)
    second_delete = await db.database.delete(registry.id, owner)
    missing_delete = await db.database.delete(uuid4(), owner)
    active = await db.database.get(registry.id)
    deleted_registry = await db.database.get(registry.id, include_deleted=True)

    # Assert
    assert deleted is True
    assert second_delete is False
    assert missing_delete is False
    assert active is None
    assert deleted_registry is not None
    assert deleted_registry.deleted_id == owner.id
    assert await db.database.fetch_all() == []


async def test_delete_rejects_database_registry_used_by_active_applications(users: tuple[User, User, User]) -> None:
    """Reject deleting a database registry while active applications use it."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
        "primary-database",
        "postgres.example",
        5432,
        "longlink",
        "secret",
        location.id,
        owner,
    )
    await db.applications.create(
        organization.id,
        "Dashboard",
        "dashboard",
        "ghcr.io/longlink/dashboard:latest",
        owner,
        database_registry_id=registry.id,
    )

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.database.delete(registry.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Database registry is used by active applications"
