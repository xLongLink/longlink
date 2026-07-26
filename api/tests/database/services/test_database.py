from uuid import uuid4
from factories import create_ready_infrastructure
from src.database.services import database


async def test_get_and_fetch_return_database_registry() -> None:
    """Return one independently registered database backend."""

    # Arrange
    infrastructure = await create_ready_infrastructure(slug="primary", name="Primary")
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
    assert reloaded.id == registry.id
    assert missing is None
