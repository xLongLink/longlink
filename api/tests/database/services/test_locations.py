import pytest
from fastapi import HTTPException
from uuid import uuid4
from types import SimpleNamespace
from src.models.storages import StorageKind
from src.models.databases import DatabaseKind
from src.models.locations import LocationProvider
from src.database.models.users import User
from src.database.services import users
from src.database.services import compute
from src.database.services import storage
from src.database.services import database
from src.database.services import locations
from src.database.services import organizations

db = SimpleNamespace(
    compute=compute,
    database=database,
    locations=locations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_create_get_and_fetch_all_return_active_locations(users: tuple[User, User, User]) -> None:
    """Persist a location and return it through read services."""

    # Arrange
    owner = users[0]

    # Act
    location = await db.locations.create("primary", "Primary", owner, "CH", LocationProvider.hetzner)
    fetched = await db.locations.fetch_all()
    reloaded = await db.locations.get(location.id)

    # Assert
    assert location.name == "Primary"
    assert location.slug == "primary"
    assert location.country == "CH"
    assert location.provider == LocationProvider.hetzner
    assert location.created_id == owner.id
    assert location.updated_id == owner.id
    assert [item.id for item in fetched] == [location.id]
    assert reloaded is not None
    assert reloaded.id == location.id


async def test_create_rejects_duplicate_location_slug(users: tuple[User, User, User]) -> None:
    """Reject a second location with the same slug."""

    # Arrange
    owner = users[0]
    await db.locations.create("primary", "Primary", owner, "CH")

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.locations.create("primary", "Primary!", owner, "CH")

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Location already exists"


async def test_delete_soft_deletes_location_and_read_services_ignore_it(users: tuple[User, User, User]) -> None:
    """Soft-delete an unused location and hide it from active read services."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")

    # Act
    deleted = await db.locations.delete(location.id, owner)
    second_delete = await db.locations.delete(location.id, owner)
    missing_delete = await db.locations.delete(uuid4(), owner)

    # Assert
    assert deleted is True
    assert second_delete is False
    assert missing_delete is False
    assert await db.locations.get(location.id) is None
    assert await db.locations.fetch_all() == []


async def test_delete_rejects_location_used_by_active_organizations(users: tuple[User, User, User]) -> None:
    """Reject deleting a location while active organizations depend on it."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    await db.organizations.create("acme", "acme", location.id, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.locations.delete(location.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Location is used by active organizations"
    assert await db.locations.get(location.id) is not None


async def test_delete_rejects_location_used_by_active_compute_registries(users: tuple[User, User, User]) -> None:
    """Reject deleting a location while active compute registries depend on it."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    await db.compute.create(
        "Primary compute",
        "primary-compute",
        "kubeconfig",
        "apps.example",
        location.id,
        owner,
    )

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.locations.delete(location.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Location is used by active compute registries"


async def test_delete_rejects_location_used_by_active_database_registries(users: tuple[User, User, User]) -> None:
    """Reject deleting a location while active database registries depend on it."""

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
        await db.locations.delete(location.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Location is used by active database registries"


async def test_delete_rejects_location_used_by_active_storage_registries(users: tuple[User, User, User]) -> None:
    """Reject deleting a location while active storage registries depend on it."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    await db.storage.create(
        StorageKind.s3,
        "Primary storage",
        "primary-storage",
        "s3",
        "https://s3.example",
        "access-key",
        "secret-key",
        location.id,
        owner,
    )

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.locations.delete(location.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Location is used by active storage registries"
