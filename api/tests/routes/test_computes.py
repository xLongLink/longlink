import pytest
from uuid import uuid4
from httpx2 import AsyncClient
from factories import (
    create_compute,
    fetch_operations,
)


async def test_compute_registry_creation_does_not_queue_work(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Register an inline-verified Compute without queuing work."""

    # Arrange
    payload = {
        "name": "Queued Compute",
        "gateway_url": "https://gateway.example",
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
    assert response.json()["database_storage_class"] == "local-path"
    assert await fetch_operations() == []


@pytest.mark.parametrize(
    ("error", "name"),
    [
        pytest.param(
            ValueError("Compute package is incompatible; deploy a supported Compute package"),
            "Incompatible Compute",
            id="incompatible-package",
        ),
        pytest.param(RuntimeError("gateway unavailable"), "Unready Compute", id="unready-infrastructure"),
    ],
)
async def test_compute_registry_creation_rejects_failed_inline_verification(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch, error: Exception, name: str
) -> None:
    """Return 503 without persistence when inline verification fails."""

    # Arrange
    async def failed_gateway(_cluster: object, _url: str, _certificate: str | None, **_kwargs: object) -> None:
        """Report inline verification failure."""

        raise error

    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", failed_gateway)
    payload = {
        "name": name,
        "gateway_url": "https://gateway.example",
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
    assert name not in {item["name"] for item in list_response.json()["items"]}


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
