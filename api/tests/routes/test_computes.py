import pytest
from uuid import uuid4
from httpx2 import AsyncClient
from factories import (
    create_compute,
    fetch_operations,
)


async def test_compute_registry_rejects_exec_authentication_before_constructing_kubernetes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject executable kubeconfig credentials before any cluster access."""

    # Arrange
    def unexpected_kubernetes(*_args: object) -> object:
        """Reject cluster construction after invalid request validation."""

        raise AssertionError("Kubernetes must not be constructed")

    monkeypatch.setattr("src.routes.v1.computes.Kubernetes", unexpected_kubernetes)
    payload = {
        "name": "Unsafe Compute",
        "gateway_url": "https://gateway.example",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [
                {
                    "name": "user",
                    "user": {"exec": {"apiVersion": "client.authentication.k8s.io/v1", "command": "untrusted"}},
                }
            ],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid request. Please check your input and try again."}
    assert await fetch_operations() == []


async def test_compute_registry_creation_rejects_failed_inline_verification(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch, compute_runtime: None
) -> None:
    """Return 503 without persistence when inline verification fails."""

    # Arrange
    async def failed_gateway(_cluster: object, _url: str, _certificate: str | None, **_kwargs: object) -> None:
        """Report inline verification failure."""

        raise RuntimeError("gateway unavailable")

    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", failed_gateway)
    payload = {
        "name": "Unready Compute",
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
    assert response.json() == {"detail": "Compute infrastructure is unavailable; verify endpoints, credentials, and certificates"}
    assert await fetch_operations() == []

    # Verify rejected registration left no committed Compute through an authorized request.
    list_response = await clients[0].get("/api/v1/computes")
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [], "total": 0}


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
