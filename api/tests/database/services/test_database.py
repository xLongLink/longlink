from uuid import uuid4
from factories import create_ready_infrastructure
from src.database.services import database
from src.database.models.users import User


async def test_get_and_fetch_return_database_registry(users: tuple[User, User, User]) -> None:
    """Return one independently registered database backend."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner, slug="primary", name="Primary")
    registry = infrastructure.database

    # Act
    fetched = await database.fetch()
    reloaded = await database.get(registry.id)
    missing = await database.get(uuid4())

    # Assert
    assert registry.name.startswith("Primary database")
    assert registry.slug.endswith("-database")
    assert registry.host == "database.example"
    assert registry.port == 5432
    assert registry.username == "admin"
    assert registry.password == "secret"
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.created_by is not None
    assert reloaded.updated_by is not None
    assert reloaded.created_by.id == owner.id
    assert reloaded.updated_by.id == owner.id
    assert reloaded.id == registry.id
    assert missing is None
