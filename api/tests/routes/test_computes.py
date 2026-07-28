from httpx2 import AsyncClient
from factories import create_organization, create_ready_infrastructure
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User


async def test_compute_registry_endpoints_return_backend(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return an independently registered compute backend."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    registry = infrastructure.compute

    # Act
    list_response = await client.get("/api/computes")
    get_response = await client.get(f"/api/computes/{registry.id}")

    # Assert
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [str(registry.id)]
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["status"] == "running"
    assert payload["version"] is not None
    assert "gateway_url" not in payload
    assert "kubeconfig" not in payload
    assert "proxy_secret" not in payload
    assert "created_at" not in payload


async def test_compute_registry_create_duplicate_and_delete(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Create one compute registry, reject a duplicate, and remove the unused registration."""

    # Arrange
    client = clients[0]

    # Act
    create_response = await client.post(
        "/api/computes",
        json={"name": "Ephemeral Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )
    duplicate_response = await client.post(
        "/api/computes",
        json={"name": "Ephemeral Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )
    created = create_response.json()
    registry_id = created["id"]
    delete_response = await client.delete(f"/api/computes/{registry_id}")
    retry_response = await client.delete(f"/api/computes/{registry_id}")
    get_response = await client.get(f"/api/computes/{registry_id}")

    # Assert
    assert create_response.status_code == 202
    assert created["name"] == "Ephemeral Compute"
    assert "gateway_url" not in created
    assert "kubeconfig" not in created
    assert "proxy_secret" not in created
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Compute registry already exists"}
    assert delete_response.status_code == 204
    assert retry_response.status_code == 404
    assert get_response.status_code == 404


async def test_compute_registry_delete_rejects_assigned_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Keep compute registries while any Organization still references them."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    await create_organization(owner)
    client = clients[0]

    # Act
    response = await client.delete(f"/api/computes/{infrastructure.compute.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry is used by organizations"}


async def test_compute_registry_routes_require_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject Platform users from compute registry administration."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    registry = infrastructure.compute
    client = clients[1]

    # Act
    read_response = await client.get("/api/computes")
    get_response = await client.get(f"/api/computes/{registry.id}")
    diagnostics_response = await client.get(f"/api/computes/{registry.id}/namespaces")
    write_response = await client.post(
        "/api/computes",
        json={"name": "Denied Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )

    # Assert
    for response in (read_response, get_response, diagnostics_response, write_response):
        assert response.status_code == 403
        assert response.json() == {"detail": "Permission required"}


async def test_compute_diagnostics_return_namespaces_and_pods(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
) -> None:
    """Return simple live namespace and pod diagnostics from the compute adapter."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

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
    namespaces_response = await client.get(f"/api/computes/{infrastructure.compute.id}/namespaces")
    pods_response = await client.get(f"/api/computes/{infrastructure.compute.id}/namespaces/acme/pods")
    missing_response = await client.get(f"/api/computes/{infrastructure.compute.id}/namespaces/missing/pods")

    # Assert
    assert namespaces_response.status_code == 200
    assert namespaces_response.json() == ["acme"]
    assert pods_response.status_code == 200
    assert pods_response.json() == [{"name": "dashboard-123", "node": "node-a", "status": "Running"}]
    assert missing_response.status_code == 404
    assert missing_response.json() == {"detail": "Compute namespace not found"}


async def test_compute_diagnostics_return_unavailable_when_backend_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch,
) -> None:
    """Return a stable error when live namespace inspection fails."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

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
    response = await client.get(f"/api/computes/{infrastructure.compute.id}/namespaces")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Compute namespaces unavailable"}
