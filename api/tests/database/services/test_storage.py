from uuid import uuid4
from factories import create_ready_infrastructure
from src.database.services import storage


async def test_get_and_fetch_return_storage_registry() -> None:
    """Return one independently registered Exoscale SOS backend."""

    # Arrange
    infrastructure = await create_ready_infrastructure(slug="primary", name="Primary")
    registry = infrastructure.storage

    # Act
    fetched = await storage.fetch()
    reloaded = await storage.get(registry.id)
    missing = await storage.get(uuid4())

    # Assert
    assert registry.name.startswith("Primary storage")
    assert registry.slug.endswith("-storage")
    assert registry.endpoint_url == "https://sos-ch-gva-2.exo.io"
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.id == registry.id
    assert missing is None
