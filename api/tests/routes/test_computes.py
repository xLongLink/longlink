from uuid import UUID
from factories import create_ready_infrastructure
from factories import create_organization
from fastapi.testclient import TestClient
from src.models.operations import OperationStatus
from src.database.services import compute
from src.database.models.users import User


async def test_compute_registry_endpoints_return_backend(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return an independently registered compute backend."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    infrastructure = await create_ready_infrastructure(user1)
    registry = infrastructure.compute

    # Act
    list_response = client.get("/api/computes")
    get_response = client.get(f"/api/computes/{registry.id}")

    # Assert
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [str(registry.id)]
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["gateway_url"] == "https://gateway.example"
    assert payload["status"] == "ready"
    assert payload["version"] is not None
    assert "kubeconfig" not in payload
    assert "proxy_secret" not in payload


async def test_compute_registry_create_duplicate_and_delete(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Create one compute registry, reject a duplicate, and tombstone the unused registry."""

    # Arrange
    client = clients[0]

    # Act
    create_response = client.post(
        "/api/computes",
        json={"name": "Ephemeral Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )
    duplicate_response = client.post(
        "/api/computes",
        json={"name": "Ephemeral Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )
    registry_id = create_response.json()["compute"]["id"]
    delete_response = client.delete(f"/api/computes/{registry_id}")
    get_response = client.get(f"/api/computes/{registry_id}")

    # Assert
    assert create_response.status_code == 202
    payload = create_response.json()
    assert payload["compute"]["name"] == "Ephemeral Compute"
    assert payload["operation"]["status"] == OperationStatus.scheduled
    assert "kubeconfig" not in payload["compute"]
    assert "proxy_secret" not in payload["compute"]
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Compute registry already exists"}
    assert delete_response.status_code == 202
    assert get_response.status_code == 404
    deleted = await compute.get(UUID(registry_id), include_deleted=True)
    assert deleted is not None
    assert deleted.deleted_at is not None


async def test_compute_registry_delete_rejects_assigned_registry(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Keep compute registries while any Organization still references them."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    await create_organization(infrastructure, owner)
    client = clients[0]

    # Act
    response = client.delete(f"/api/computes/{infrastructure.compute.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry is used by organizations"}


async def test_compute_diagnostics_return_namespaces_and_pods(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return simple live namespace and pod diagnostics from the compute adapter."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)

    class Pod:
        """Minimal pod object returned by the fake Kubernetes client."""

        name = "dashboard-123"
        raw = {"status": {"phase": "Running"}, "spec": {"nodeName": "node-a"}}

    class FakeKubernetes:
        """Return deterministic diagnostic data."""

        def __init__(self, kubeconfig: str) -> None:
            """Validate the selected compute registry."""

            assert kubeconfig == infrastructure.compute.kubeconfig

        async def namespaces(self) -> list[str]:
            """Return visible namespaces."""

            return ["acme"]

        async def pods(self, namespace: str) -> list[Pod]:
            """Return visible pods in the requested namespace."""

            assert namespace == "acme"
            return [Pod()]

    monkeypatch.setattr("src.routes.computes.Kubernetes", FakeKubernetes)
    client = clients[0]

    # Act
    namespaces_response = client.get(f"/api/computes/{infrastructure.compute.id}/namespaces")
    pods_response = client.get(f"/api/computes/{infrastructure.compute.id}/namespaces/acme/pods")
    missing_response = client.get(f"/api/computes/{infrastructure.compute.id}/namespaces/missing/pods")

    # Assert
    assert namespaces_response.status_code == 200
    assert namespaces_response.json() == ["acme"]
    assert pods_response.status_code == 200
    assert pods_response.json() == [{"name": "dashboard-123", "node": "node-a", "status": "Running"}]
    assert missing_response.status_code == 404
    assert missing_response.json() == {"detail": "Compute namespace not found"}


async def test_compute_diagnostics_return_unavailable_when_backend_fails(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return a stable error when live namespace inspection fails."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)

    class FailingKubernetes:
        """Raise a provider error for namespace inspection."""

        def __init__(self, kubeconfig: str) -> None:
            """Accept the selected registry kubeconfig."""

            assert kubeconfig == infrastructure.compute.kubeconfig

        async def namespaces(self) -> list[str]:
            """Raise the backend error expected by the test."""

            raise RuntimeError("cluster offline")

    monkeypatch.setattr("src.routes.computes.Kubernetes", FailingKubernetes)
    client = clients[0]

    # Act
    response = client.get(f"/api/computes/{infrastructure.compute.id}/namespaces")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Compute namespaces unavailable"}
