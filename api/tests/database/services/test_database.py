import pytest
from uuid import uuid4
from types import SimpleNamespace
from src.models.countries import Country
from src.models.databases import DatabaseKind
from src.database.models.users import User
from src.database.services import database
from src.database.services import locations
from src.database.services import applications
from src.database.services import organizations

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
    location = await db.locations.create("primary", "Primary", owner, Country.CH)

    # Act
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
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
    assert registry.runtime_host == "postgres.example"
    assert registry.runtime_port == 5432
    assert registry.location_id == location.id
    assert registry.created_by.id == owner.id
    assert registry.updated_by.id == owner.id
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.id == registry.id


async def test_create_persists_database_runtime_connection_overrides(users: tuple[User, User, User]) -> None:
    """Persist database runtime host and port overrides when provided."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)

    # Act
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
        "postgres.example",
        5432,
        "longlink",
        "secret",
        location.id,
        owner,
        runtime_host="postgres.runtime",
        runtime_port=15432,
    )

    # Assert
    assert registry.runtime_host == "postgres.runtime"
    assert registry.runtime_port == 15432


async def test_create_rejects_duplicate_database_registry_names(users: tuple[User, User, User]) -> None:
    """Reject a second database registry with the same name."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
        "postgres.example",
        5432,
        "longlink",
        "secret",
        location.id,
        owner,
    )

    # Act
    with pytest.raises(ValueError) as exc:
        await db.database.create(
            DatabaseKind.postgresql,
            "Primary database",
            "other-postgres.example",
            5433,
            "other",
            "other-secret",
            location.id,
            owner,
        )

    # Assert
    assert str(exc.value) == "Database registry already exists"


async def test_delete_soft_deletes_database_registry_and_include_deleted_can_reload_it(
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an unused database registry and hide it from active reads."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
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
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    registry = await db.database.create(
        DatabaseKind.postgresql,
        "Primary database",
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
    with pytest.raises(ValueError) as exc:
        await db.database.delete(registry.id, owner)

    # Assert
    assert str(exc.value) == "Database registry is used by active applications"
