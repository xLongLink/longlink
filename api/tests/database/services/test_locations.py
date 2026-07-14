import pytest
from uuid import uuid4
from types import SimpleNamespace
from fastapi import HTTPException
from collections.abc import Callable, Awaitable
from src.models.storages import StorageKind
from src.models.databases import DatabaseKind
from src.models.locations import LocationProvider
from src.database.services import users, compute, storage, database, locations, organizations
from src.database.models.users import User

db = SimpleNamespace(
    compute=compute,
    database=database,
    locations=locations,
    organizations=organizations,
    storage=storage,
    users=users,
)

LOCATION_DEPENDENCY_CASES = [
    pytest.param(
        db.organizations.create,
        ("acme", "acme"),
        "Location is used by active organizations",
        id="organization",
    ),
    pytest.param(
        db.compute.create,
        ("Primary compute", "primary-compute", "kubeconfig", "https://apps.example"),
        "Location is used by active compute registries",
        id="compute-registry",
    ),
    pytest.param(
        db.database.create,
        (DatabaseKind.postgresql, "Primary database", "primary-database", "postgres.example", 5432, "longlink", "secret"),
        "Location is used by active database registries",
        id="database-registry",
    ),
    pytest.param(
        db.storage.create,
        (StorageKind.minio, "Primary storage", "primary-storage", "https://minio.example", "access-key", "secret-key"),
        "Location is used by active storage registries",
        id="storage-registry",
    ),
]


async def test_create_get_and_fetch_return_active_locations(users: tuple[User, User, User]) -> None:
    """Persist a location and return it through read services."""

    # Arrange
    owner = users[0]

    # Act
    location = await db.locations.create("primary", "Primary", owner, "CH", LocationProvider.hetzner)
    fetched = await db.locations.fetch()
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
    assert await db.locations.fetch() == []


@pytest.mark.parametrize(("create_dependency", "args", "expected_detail"), LOCATION_DEPENDENCY_CASES)
async def test_delete_rejects_location_used_by_active_dependency(
    users: tuple[User, User, User],
    create_dependency: Callable[..., Awaitable[object]],
    args: tuple[object, ...],
    expected_detail: str,
) -> None:
    """Reject deleting a location while an active resource depends on it."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    await create_dependency(*args, location.id, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.locations.delete(location.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == expected_detail
    assert await db.locations.get(location.id) is not None
