import pytest
from uuid import uuid4
from types import SimpleNamespace
from fastapi import HTTPException
from src.models.storages import StorageKind
from src.database.services import storage, locations, applications, organizations
from src.database.models.users import User

db = SimpleNamespace(
    applications=applications,
    locations=locations,
    organizations=organizations,
    storage=storage,
)


async def test_create_get_and_fetch_return_active_storage_registries(users: tuple[User, User, User]) -> None:
    """Persist a storage registry and return it through read services."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")

    # Act
    registry = await db.storage.create(
        StorageKind.s3,
        "Primary storage",
        "primary-storage",
        "https://s3.example",
        "access-key",
        "secret-key",
        location.id,
        owner,
    )
    fetched = await db.storage.fetch()
    reloaded = await db.storage.get(registry.id)

    # Assert
    assert registry.kind == StorageKind.s3
    assert registry.name == "Primary storage"
    assert registry.slug == "primary-storage"
    assert registry.endpoint_url == "https://s3.example"
    assert registry.access_key_id == "access-key"
    assert registry.secret_access_key == "secret-key"
    assert registry.runtime_endpoint_url == "https://s3.example"
    assert registry.location_id == location.id
    assert registry.created_by.id == owner.id
    assert registry.updated_by.id == owner.id
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.id == registry.id


async def test_create_persists_storage_runtime_endpoint_override(users: tuple[User, User, User]) -> None:
    """Persist storage runtime endpoint override when provided."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")

    # Act
    registry = await db.storage.create(
        StorageKind.s3,
        "Primary storage",
        "primary-storage",
        "https://s3.example",
        "access-key",
        "secret-key",
        location.id,
        owner,
        runtime_endpoint_url="https://s3.runtime",
    )

    # Assert
    assert registry.runtime_endpoint_url == "https://s3.runtime"


async def test_create_rejects_duplicate_storage_registry_names(users: tuple[User, User, User]) -> None:
    """Reject a second storage registry with the same name."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    await db.storage.create(
        StorageKind.s3,
        "Primary storage",
        "primary-storage",
        "https://s3.example",
        "access-key",
        "secret-key",
        location.id,
        owner,
    )

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.storage.create(
            StorageKind.s3,
            "Primary storage",
            "primary-storage",
            "https://other-s3.example",
            "other-access-key",
            "other-secret-key",
            location.id,
            owner,
        )

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Storage registry already exists"


async def test_delete_soft_deletes_storage_registry_and_include_deleted_can_reload_it(
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an unused storage registry and hide it from active reads."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    registry = await db.storage.create(
        StorageKind.s3,
        "Primary storage",
        "primary-storage",
        "https://s3.example",
        "access-key",
        "secret-key",
        location.id,
        owner,
    )

    # Act
    deleted = await db.storage.delete(registry.id, owner)
    second_delete = await db.storage.delete(registry.id, owner)
    missing_delete = await db.storage.delete(uuid4(), owner)
    active = await db.storage.get(registry.id)
    deleted_registry = await db.storage.get(registry.id, include_deleted=True)

    # Assert
    assert deleted is True
    assert second_delete is False
    assert missing_delete is False
    assert active is None
    assert deleted_registry is not None
    assert deleted_registry.deleted_id == owner.id
    assert await db.storage.fetch() == []


async def test_delete_rejects_storage_registry_used_by_active_applications(users: tuple[User, User, User]) -> None:
    """Reject deleting a storage registry while active applications use it."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    registry = await db.storage.create(
        StorageKind.s3,
        "Primary storage",
        "primary-storage",
        "https://s3.example",
        "access-key",
        "secret-key",
        location.id,
        owner,
    )
    await db.applications.create(
        organization.id,
        "Dashboard",
        "dashboard",
        "ghcr.io/longlink/dashboard:latest",
        owner,
        storage_registry_id=registry.id,
    )

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.storage.delete(registry.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Storage registry is used by active applications"
