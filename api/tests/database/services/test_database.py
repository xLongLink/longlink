from uuid import uuid4
from types import SimpleNamespace
from factories import create_ready_location
from src.database.services import database
from src.database.models.users import User
from src.models.infrastructure import DatabaseKind

db = SimpleNamespace(database=database)


async def test_get_and_fetch_return_location_database_registry(users: tuple[User, User, User]) -> None:
    """Return the database backend owned by a complete location aggregate."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner, slug="primary", name="Primary")
    registry = await db.database.location(location.id)
    assert registry is not None

    # Act
    fetched = await db.database.fetch()
    reloaded = await db.database.get(registry.id)

    # Assert
    assert registry.kind == DatabaseKind.postgresql
    assert registry.name.startswith("primary-")
    assert registry.slug.endswith("-database")
    assert registry.host == "database.example"
    assert registry.port == 5432
    assert registry.username == "admin"
    assert registry.password == "secret"
    assert registry.location_id == location.id
    assert registry.created_by.id == owner.id
    assert registry.updated_by.id == owner.id
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.id == registry.id


async def test_location_selects_database_registry_and_ignores_missing_location(users: tuple[User, User, User]) -> None:
    """Select a database backend by its immutable location identity."""

    # Arrange
    owner = users[0]
    first = await create_ready_location(owner, slug="first", name="First")
    second = await create_ready_location(owner, slug="second", name="Second")

    # Act
    first_registry = await db.database.location(first.id)
    second_registry = await db.database.location(second.id)
    missing = await db.database.location(uuid4())

    # Assert
    assert first_registry is not None
    assert second_registry is not None
    assert first_registry.id != second_registry.id
    assert first_registry.location_id == first.id
    assert second_registry.location_id == second.id
    assert missing is None
