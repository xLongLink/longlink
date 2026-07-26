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


async def test_stage_gateway_tls_retains_previous_ca() -> None:
    """Store the previous gateway CA while staging replacement TLS material."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    staged = await compute.stage_gateway_tls(
        infrastructure.compute.id,
        "new-ca",
        "new-certificate",
        "new-private-key",
    )
    reloaded = await compute.get(infrastructure.compute.id)

    # Assert
    assert staged is True
    assert reloaded is not None
    assert reloaded.gateway_previous_ca_certificate == "test-ca"
    assert reloaded.gateway_ca_certificate == "new-ca"
    assert reloaded.gateway_tls_certificate == "new-certificate"
