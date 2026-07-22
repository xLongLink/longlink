from uuid import uuid4
from types import SimpleNamespace
from factories import create_ready_infrastructure
from src.models.types import StorageKind
from src.database.services import storage
from src.database.models.users import User

db = SimpleNamespace(storage=storage)


async def test_get_and_fetch_return_storage_registry(users: tuple[User, User, User]) -> None:
    """Return one independently registered Exoscale SOS backend."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner, slug="primary", name="Primary")
    registry = infrastructure.storage

    # Act
    fetched = await db.storage.fetch()
    reloaded = await db.storage.get(registry.id)
    missing = await db.storage.get(uuid4())

    # Assert
    assert registry.kind == StorageKind.exoscale
    assert registry.name.startswith("Primary storage")
    assert registry.slug.endswith("-storage")
    assert registry.endpoint_url == "https://sos-ch-gva-2.exo.io"
    assert registry.runtime_endpoint_url == "https://sos-ch-gva-2.exo.io"
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.created_by is not None
    assert reloaded.updated_by is not None
    assert reloaded.created_by.id == owner.id
    assert reloaded.updated_by.id == owner.id
    assert reloaded.id == registry.id
    assert missing is None
