import pytest
from uuid import uuid4
from types import SimpleNamespace
from src.constants import INGRESS_NAME
from src.models.countries import Country
from src.models.computes import ComputeKind
from src.database.models.users import User
from src.database.services import compute
from src.database.services import locations
from src.database.services import applications
from src.database.services import organizations

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
    location = await db.locations.create("primary", "Primary", owner, Country.CH)

    # Act
    registry = await db.compute.create(
        ComputeKind.kubernetes,
        "Primary compute",
        "kubeconfig",
        "apps.example",
        location.id,
        owner,
    )
    fetched = await db.compute.fetch_all()
    reloaded = await db.compute.get(registry.id)

    # Assert
    assert registry.kind == ComputeKind.kubernetes
    assert registry.name == "Primary compute"
    assert registry.slug == "primary-compute"
    assert registry.kubeconfig == "kubeconfig"
    assert registry.ingress_host == "apps.example"
    assert registry.ingress_name == INGRESS_NAME
    assert registry.proxy_secret
    assert registry.location_id == location.id
    assert registry.created_by.id == owner.id
    assert registry.updated_by.id == owner.id
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.id == registry.id


async def test_create_rejects_duplicate_compute_registry_names(users: tuple[User, User, User]) -> None:
    """Reject a second compute registry with the same name."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    await db.compute.create(ComputeKind.kubernetes, "Primary compute", "kubeconfig", "apps.example", location.id, owner)

    # Act
    with pytest.raises(ValueError) as exc:
        await db.compute.create(
            ComputeKind.kubernetes,
            "Primary compute",
            "other-kubeconfig",
            "other.example",
            location.id,
            owner,
        )

    # Assert
    assert str(exc.value) == "Compute registry already exists"


async def test_delete_soft_deletes_compute_registry_and_include_deleted_can_reload_it(
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an unused compute registry and hide it from active reads."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    registry = await db.compute.create(
        ComputeKind.kubernetes,
        "Primary compute",
        "kubeconfig",
        "apps.example",
        location.id,
        owner,
    )

    # Act
    deleted = await db.compute.delete(registry.id, owner)
    second_delete = await db.compute.delete(registry.id, owner)
    missing_delete = await db.compute.delete(uuid4(), owner)
    active = await db.compute.get(registry.id)
    deleted_registry = await db.compute.get(registry.id, include_deleted=True)

    # Assert
    assert deleted is True
    assert second_delete is False
    assert missing_delete is False
    assert active is None
    assert deleted_registry is not None
    assert deleted_registry.deleted_id == owner.id
    assert await db.compute.fetch_all() == []


async def test_delete_rejects_compute_registry_used_by_active_applications(users: tuple[User, User, User]) -> None:
    """Reject deleting a compute registry while active applications use it."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("primary", "Primary", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    registry = await db.compute.create(
        ComputeKind.kubernetes,
        "Primary compute",
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
    with pytest.raises(ValueError) as exc:
        await db.compute.delete(registry.id, owner)

    # Assert
    assert str(exc.value) == "Compute registry is used by active applications"
