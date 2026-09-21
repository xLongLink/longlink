import pytest
from uuid import uuid4
from httpx2 import AsyncClient
from conftest import FakeKubernetes
from factories import (
    create_compute,
    fetch_operations,
)


async def test_compute_list_reports_live_package_versions(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Resolve live Compute versions in parallel without failing unreachable clusters."""

    # Arrange
    compute = await create_compute()

    class FakeConfigMap:
        """Expose one installed package version."""

        def __init__(self, name: str, namespace: str, api: object) -> None:
            """Ignore the selected release coordinates."""

        async def refresh(self) -> None:
            """Return the current observation."""

        raw = {"data": {"contract": "1", "platform_version": "v9.9.9"}}

    class ReleaseKubernetes(FakeKubernetes):
        """Expose the release boundary without opening a cluster connection."""

        def __init__(self, kubeconfig: object) -> None:
            """Ignore the stored connection settings."""

            super().__init__()

        async def api(self) -> object:
            """Return the release boundary."""

            return object()

    monkeypatch.setattr("src.routes.v1.computes.Kubernetes", ReleaseKubernetes)
    monkeypatch.setattr("src.kubernetes.gateway.ConfigMap", FakeConfigMap)

    # Act
    response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 200
    items = [item for item in response.json()["items"] if item["id"] == str(compute.id)]
    assert len(items) == 1
    assert items[0]["live_version"] == "v9.9.9"


async def test_compute_list_omits_live_version_when_cluster_unreachable(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return stored Compute overview with a missing version when the cluster is unreachable."""

    # Arrange
    compute = await create_compute()

    async def unreachable_version(cluster: object) -> str | None:
        """Report the unreachable release boundary."""

        raise LookupError("release unavailable")

    monkeypatch.setattr("src.routes.v1.computes.gateway.read_package_version", unreachable_version)

    # Act
    response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 200
    items = [item for item in response.json()["items"] if item["id"] == str(compute.id)]
    assert len(items) == 1
    assert items[0]["live_version"] is None


async def test_compute_registry_creation_does_not_queue_work(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Register an inline-verified Compute without queuing work."""

    # Arrange
    payload = {
        "name": "Queued Compute",
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {}}],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 201
    assert await fetch_operations() == []


async def test_compute_registry_creation_rejects_incompatible_package(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return 503 without persisting when inline verification rejects the Compute package."""

    # Arrange
    async def incompatible_gateway(
        _cluster: object, _url: str, _certificate: str | None, **_kwargs: object
    ) -> None:
        """Report the incompatible Compute package."""

        raise ValueError("Compute package is incompatible; deploy a supported Compute package")

    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", incompatible_gateway)
    payload = {
        "name": "Incompatible Compute",
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {}}],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 503
    assert await fetch_operations() == []
    list_response = await clients[0].get("/api/v1/computes")
    assert "Incompatible Compute" not in {item["name"] for item in list_response.json()["items"]}


async def test_compute_registry_creation_rejects_unready_infrastructure(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return 503 without persisting when shared infrastructure is unavailable."""

    # Arrange
    async def unavailable_gateway(
        _cluster: object, _url: str, _certificate: str | None, **_kwargs: object
    ) -> None:
        """Report the unavailable gateway."""

        raise RuntimeError("gateway unavailable")

    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", unavailable_gateway)
    payload = {
        "name": "Unready Compute",
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {}}],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 503
    assert await fetch_operations() == []
    list_response = await clients[0].get("/api/v1/computes")
    assert "Unready Compute" not in {item["name"] for item in list_response.json()["items"]}


async def test_compute_registry_deletes_unused_registration(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Remove a Compute registration without changing its cluster."""

    # Arrange
    compute = await create_compute()

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{compute.id}")
    list_response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 204
    assert list_response.status_code == 200
    assert str(compute.id) not in {item["id"] for item in list_response.json()["items"]}


async def test_compute_registry_deletion_rejects_unknown_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return the Compute-specific error when deleting an unknown registration."""

    # Arrange
    registry_id = uuid4()

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{registry_id}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Compute registry not found"}
