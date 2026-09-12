import pytest
from httpx2 import AsyncClient
from factories import create_organization, create_ready_infrastructure
from src.database.models.users import User


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        pytest.param("GET", "computes", None, id="list-computes"),
        pytest.param("GET", "users", None, id="list-users"),
        pytest.param("GET", "organizations", None, id="list-organizations"),
        pytest.param("GET", "solutions", None, id="list-solutions"),
        pytest.param("POST", "computes", {}, id="create-compute"),
    ],
)
async def test_platform_user_cannot_access_administrator_registries(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], method: str, path: str, payload: dict[str, object] | None
) -> None:
    """Reject registry collection reads and creation before payload validation."""

    # Act
    response = await clients[1].request(method, f"/api/v1/{path}", json=payload)

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_platform_user_cannot_delete_compute_registry(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Reject registry deletion without modifying the registered backend."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    compute = infrastructure.compute

    # Act
    response = await clients[1].delete(f"/api/v1/computes/{compute.id}")
    list_response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    assert list_response.status_code == 200
    assert str(compute.id) in {item["id"] for item in list_response.json()["items"]}


async def test_compute_list_returns_ordered_page_and_total(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Return an ordered registry page without credentials."""

    # Arrange
    payload = {
        "bucket_size_bytes": 1073741824,
        "bucket_max_objects": 10000,
        "storage_reserve_percent": 30,
        "storage_object_overhead_bytes": 65536,
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "storage_class": "block-storage",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {}}],
        },
    }
    expected_item = {
        "bucket_size_bytes": 1073741824,
        "bucket_max_objects": 10000,
        "storage_reserve_percent": 30,
        "storage_object_overhead_bytes": 65536,
        "gateway_url": "https://gateway.example",
        "status": "creating",
        "database_storage_class": "local-path",
        "database_size_gib": 10,
        "database_instances": 1,
        "storage_class": "block-storage",
        "storage_endpoint": "https://storage.example",
        "storage_size_gib": 100,
        "storage_instances": 3,
    }
    beta_response = await clients[0].post("/api/v1/computes", json=payload | {"name": "Beta Registry"})
    alpha_response = await clients[0].post("/api/v1/computes", json=payload | {"name": "Alpha Registry"})
    assert alpha_response.status_code == 202
    assert beta_response.status_code == 202
    beta_id = beta_response.json()["id"]

    # Act
    response = await clients[0].get("/api/v1/computes?page=2&page_size=1")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"items": [{"id": beta_id, "name": "Beta Registry"} | expected_item], "total": 2}


async def test_compute_registry_creation_redacts_credentials_and_rejects_duplicate_name(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Create a Compute registry without exposing credentials and reject a duplicate name."""

    # Arrange
    payload = {
        "name": "Ephemeral Compute",
        "bucket_size_bytes": 1073741824,
        "bucket_max_objects": 10000,
        "storage_reserve_percent": 30,
        "storage_object_overhead_bytes": 65536,
        "storage_class": "block-storage",
        "storage_endpoint": "https://storage.example",
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {"token": "compute-credential-must-not-leak"}}],
        },
    }

    create_response = await clients[0].post("/api/v1/computes", json=payload)
    duplicate_response = await clients[0].post("/api/v1/computes", json=payload)
    created = create_response.json()

    assert create_response.status_code == 202
    assert created["name"] == payload["name"]
    assert "kubeconfig" not in created
    assert "compute-credential-must-not-leak" not in create_response.text
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Compute registry already exists"}


async def test_compute_registry_deletes_unused_registration(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Delete an unassigned Compute registry and reject repeated deletion."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    registry_id = infrastructure.compute.id

    # Act
    delete_response = await clients[0].delete(f"/api/v1/computes/{registry_id}")
    list_response = await clients[0].get("/api/v1/computes")
    repeat_delete_response = await clients[0].delete(f"/api/v1/computes/{registry_id}")

    # Assert
    assert delete_response.status_code == 204
    assert list_response.status_code == 200
    assert str(registry_id) not in {item["id"] for item in list_response.json()["items"]}
    assert repeat_delete_response.status_code == 404


async def test_compute_registry_delete_rejects_assigned_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Keep a Compute registry while an Organization references it."""

    infrastructure = await create_ready_infrastructure()
    await create_organization(users[0], infrastructure=infrastructure)
    registry_id = infrastructure.compute.id

    response = await clients[0].delete(f"/api/v1/computes/{registry_id}")
    list_response = await clients[0].get("/api/v1/computes")

    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry is used by organizations"}
    assert list_response.status_code == 200
    assert str(registry_id) in {item["id"] for item in list_response.json()["items"]}
