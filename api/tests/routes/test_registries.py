import pytest
from uuid import uuid4
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
    get_response = await clients[0].get(f"/api/v1/computes/{compute.id}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    assert get_response.status_code == 200


async def test_platform_user_cannot_read_compute_registry_details(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Reject registered backend detail reads from non-administrators."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    compute = infrastructure.compute

    # Act
    response = await clients[1].get(f"/api/v1/computes/{compute.id}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_compute_endpoint_returns_registered_backend(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Return the registered Compute without its secrets."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    compute = infrastructure.compute
    expected_fields = {"gateway_url": "https://gateway.example", "status": "running"}
    secret_fields = ["kubeconfig"]

    # Act
    get_response = await clients[0].get(f"/api/v1/computes/{compute.id}")

    # Assert
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(compute.id)
    assert payload["name"] == compute.name
    assert {field: payload[field] for field in expected_fields} == expected_fields
    assert all(field not in payload for field in secret_fields)
    assert all(str(getattr(compute, secret_field)) not in get_response.text for secret_field in secret_fields)


async def test_compute_endpoint_returns_resource_specific_not_found_error(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return the resource-specific error when an administrator requests an unknown registry."""

    # Act
    response = await clients[0].get(f"/api/v1/computes/{uuid4()}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Compute registry not found"}


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


@pytest.mark.parametrize(
    ("path", "payload", "secret_fields", "duplicate_error", "create_status"),
    [
        pytest.param(
            "computes",
            {
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
                    "users": [{"name": "user", "user": {}}],
                },
            },
            ["kubeconfig"],
            "Compute registry already exists",
            202,
            id="compute",
        ),
    ],
)
async def test_registry_creation_rejects_duplicate_name(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    path: str,
    payload: dict[str, object],
    secret_fields: list[str],
    duplicate_error: str,
    create_status: int,
) -> None:
    """Create each registry type and reject a duplicate name."""

    create_response = await clients[0].post(f"/api/v1/{path}", json=payload)
    duplicate_response = await clients[0].post(f"/api/v1/{path}", json=payload)
    created = create_response.json()

    assert create_response.status_code == create_status
    assert created["name"] == payload["name"]
    assert all(field not in created and str(payload[field]) not in create_response.text for field in secret_fields)
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": duplicate_error}


@pytest.mark.parametrize(
    ("path", "registry", "not_found_detail"),
    [
        pytest.param("computes", "compute", "Compute registry not found", id="compute"),
    ],
)
async def test_registry_deletes_unused_registration(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], path: str, registry: str, not_found_detail: str
) -> None:
    """Delete an unassigned registry and reject later reads or deletion."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    registry_id = getattr(infrastructure, registry).id

    # Act
    delete_response = await clients[0].delete(f"/api/v1/{path}/{registry_id}")
    get_response = await clients[0].get(f"/api/v1/{path}/{registry_id}")
    repeat_delete_response = await clients[0].delete(f"/api/v1/{path}/{registry_id}")

    # Assert
    assert delete_response.status_code == 204
    assert get_response.status_code == 404
    assert get_response.json() == {"detail": not_found_detail}
    assert repeat_delete_response.status_code == 404


@pytest.mark.parametrize(
    ("path", "registry", "error"),
    [
        pytest.param("computes", "compute", "Compute registry is used by organizations", id="compute"),
    ],
)
async def test_registry_delete_rejects_assigned_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    path: str,
    registry: str,
    error: str,
) -> None:
    """Keep registries while an Organization references them."""

    infrastructure = await create_ready_infrastructure()
    await create_organization(users[0], infrastructure=infrastructure)
    registry_id = getattr(infrastructure, registry).id

    response = await clients[0].delete(f"/api/v1/{path}/{registry_id}")
    get_response = await clients[0].get(f"/api/v1/{path}/{registry_id}")

    assert response.status_code == 409
    assert response.json() == {"detail": error}
    assert get_response.status_code == 200
