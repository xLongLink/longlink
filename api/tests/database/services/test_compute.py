import pytest
from uuid import uuid4
from types import SimpleNamespace
from fastapi import HTTPException
from src.database.services import compute, locations, applications, organizations
from src.database.models.users import User

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    locations=locations,
    organizations=organizations,
)


async def test_create_get_and_fetch_all_return_active_compute_registries(users: tuple[User, User, User]) -> None:
    """Persist a compute registry and return it through read services."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")

    # Act
    registry = await db.compute.create(
        "Primary compute",
        "primary-compute",
        "kubeconfig",
        "apps.example",
        location.id,
        owner,
    )
    fetched = await db.compute.fetch_all()
    reloaded = await db.compute.get(registry.id)

    # Assert
    assert registry.kind == "kubernetes"
    assert registry.name == "Primary compute"
    assert registry.slug == "primary-compute"
    assert registry.kubeconfig == "kubeconfig"
    assert registry.ingress_host == "apps.example"
    assert registry.proxy_secret
    assert registry.location_id == location.id
    assert registry.created_by.id == owner.id
    assert registry.updated_by.id == owner.id
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded.id == registry.id


async def test_create_rejects_duplicate_compute_registry_names(users: tuple[User, User, User]) -> None:
    """Reject a second compute registry with the same name."""

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
        await db.compute.create(
            "Primary compute",
            "primary-compute",
            "other-kubeconfig",
            "other.example",
            location.id,
            owner,
        )

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Compute registry already exists"


async def test_delete_soft_deletes_compute_registry_and_include_deleted_can_reload_it(
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an unused compute registry and hide it from active reads."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    registry = await db.compute.create(
        "Primary compute",
        "primary-compute",
        "kubeconfig",
        "apps.example",
        location.id,
        owner,
    )

    # Act
    deleted = await db.compute.delete(registry.id, owner)
    second_delete = await db.compute.delete(registry.id, owner)
    missing_delete = await db.compute.delete(uuid4(), owner)
    deleted_registry = await db.compute.get(registry.id, include_deleted=True)

    # Assert
    assert deleted is True
    assert second_delete is False
    assert missing_delete is False
    with pytest.raises(HTTPException) as exc:
        await db.compute.get(registry.id)
    assert exc.value.status_code == 404
    assert exc.value.detail == f"Compute registry '{registry.id}' not found"
    assert deleted_registry.deleted_id == owner.id
    assert await db.compute.fetch_all() == []


async def test_delete_rejects_compute_registry_used_by_active_applications(users: tuple[User, User, User]) -> None:
    """Reject deleting a compute registry while active applications use it."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    registry = await db.compute.create(
        "Primary compute",
        "primary-compute",
        "kubeconfig",
        "apps.example",
        location.id,
        owner,
    )
    await db.applications.create(
        organization.id,
        "Dashboard",
        "dashboard",
        "ghcr.io/longlink/dashboard:latest",
        owner,
        compute_registry_id=registry.id,
    )

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.compute.delete(registry.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Compute registry is used by active applications"
