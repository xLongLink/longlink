from uuid import uuid4
from types import SimpleNamespace
from factories import create_ready_location
from src.database.services import compute
from src.database.models.users import User

db = SimpleNamespace(compute=compute)


async def test_get_and_fetch_return_location_compute_registry(users: tuple[User, User, User]) -> None:
    """Return the compute backend owned by a complete location aggregate."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner, slug="primary", name="Primary")
    registry = await db.compute.location(location.id)
    assert registry is not None

    # Act
    fetched = await db.compute.fetch()
    reloaded = await db.compute.get(registry.id)

    # Assert
    assert registry.name.startswith("primary-")
    assert registry.slug.endswith("-compute")
    assert registry.kubeconfig == "apiVersion: v1\nclusters: []\n"
    assert registry.gateway_url == "https://gateway.example"
    assert registry.proxy_secret
    assert registry.location_id == location.id
    assert registry.created_by.id == owner.id
    assert registry.updated_by.id == owner.id
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.id == registry.id


async def test_location_selects_compute_registry_and_ignores_missing_location(users: tuple[User, User, User]) -> None:
    """Select a compute backend by its immutable location identity."""

    # Arrange
    owner = users[0]
    first = await create_ready_location(owner, slug="first", name="First")
    second = await create_ready_location(owner, slug="second", name="Second")

    # Act
    first_registry = await db.compute.location(first.id)
    second_registry = await db.compute.location(second.id)
    missing = await db.compute.location(uuid4())

    # Assert
    assert first_registry is not None
    assert second_registry is not None
    assert first_registry.id != second_registry.id
    assert first_registry.location_id == first.id
    assert second_registry.location_id == second.id
    assert missing is None
