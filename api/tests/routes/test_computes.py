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
    write_response = await client.post(
        "/api/computes",
        json={"name": "Denied Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )

    # Assert
    for response in (read_response, get_response, write_response):
        assert response.status_code == 403
        assert response.json() == {"detail": "Permission required"}
