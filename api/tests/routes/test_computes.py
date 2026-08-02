from httpx2 import AsyncClient
from factories import queue_operation, create_organization, create_ready_infrastructure
from src.database.services import operations
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
    assert str(registry.id) in {item["id"] for item in list_response.json()}
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(registry.id)
    assert payload["name"] == registry.name
    assert payload["gateway_url"] == registry.gateway_url
    assert payload["status"] == "running"
    assert payload["version"] is not None
    assert "kubeconfig" not in payload
    assert "proxy_secret" not in payload
    assert "created_at" not in payload


async def test_compute_registry_create_duplicate_and_blocks_deletion_while_lifecycle_is_pending(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Create one Compute registry, reject a duplicate, and retain its pending lifecycle target."""

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
    get_response = await client.get(f"/api/computes/{registry_id}")

    # Assert
    assert create_response.status_code == 202
    assert created["name"] == "Ephemeral Compute"
    assert created["gateway_url"] is None
    assert created["version"] is not None
    assert "kubeconfig" not in created
    assert "proxy_secret" not in created
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Compute registry already exists"}
    assert delete_response.status_code == 409
    assert delete_response.json() == {"detail": "Compute registry has unfinished lifecycle operation"}
    assert get_response.status_code == 200


async def test_compute_registry_deletes_unused_ready_registration(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Remove a ready Compute registration with no unfinished lifecycle Operation."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()

    # Act
    delete_response = await client.delete(f"/api/computes/{infrastructure.compute.id}")
    retry_response = await client.delete(f"/api/computes/{infrastructure.compute.id}")
    get_response = await client.get(f"/api/computes/{infrastructure.compute.id}")

    # Assert
    assert delete_response.status_code == 204
    assert retry_response.status_code == 404
    assert get_response.status_code == 404


async def test_compute_registry_deletes_registration_after_completed_lifecycle(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Remove a ready Compute registration after its lifecycle Operation completes."""

    # Arrange
    client = clients[0]
    infrastructure = await create_ready_infrastructure()
    operation = await queue_operation(infrastructure.compute.id, target_id=infrastructure.compute.id)
    claimed = await operations.claim()
    assert claimed is not None
    assert await operations.complete(claimed.id) is not None

    # Act
    response = await client.delete(f"/api/computes/{infrastructure.compute.id}")

    # Assert
    assert response.status_code == 204


async def test_compute_registry_delete_rejects_assigned_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Keep compute registries while any Organization still references them."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    await create_organization(owner, infrastructure=infrastructure)
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
    client = clients[1]

    # Act
    read_response = await client.get("/api/computes")
    get_response = await client.get("/api/computes/00000000-0000-4000-8000-000000000000")
    write_response = await client.post(
        "/api/computes",
        json={"name": "Denied Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )

    # Assert
    for response in (read_response, get_response, write_response):
        assert response.status_code == 403
        assert response.json() == {"detail": "Permission required"}
