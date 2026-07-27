from uuid import uuid4
from factories import create_ready_infrastructure
from src.database.services import compute


async def test_get_and_fetch_return_compute_registry() -> None:
    """Return one independently registered compute backend."""

    # Arrange
    infrastructure = await create_ready_infrastructure(slug="primary", name="Primary")
    registry = infrastructure.compute

    # Act
    fetched = await compute.fetch()
    reloaded = await compute.get(registry.id)
    missing = await compute.get(uuid4())

    # Assert
    assert registry.name.startswith("Primary compute")
    assert registry.slug.endswith("-compute")
    assert registry.kubeconfig == "apiVersion: v1\nclusters: []\n"
    assert registry.gateway_url == "https://gateway.example"
    assert registry.proxy_secret
    assert [item.id for item in fetched] == [registry.id]
    assert reloaded is not None
    assert reloaded.id == registry.id
    assert missing is None
