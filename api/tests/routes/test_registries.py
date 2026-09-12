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


@pytest.mark.parametrize(("path", "registry"), [("computes", "compute")])
async def test_platform_user_cannot_delete_administrator_registries(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], path: str, registry: str
) -> None:
    """Reject registry deletion without modifying the registered backend."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    backend = getattr(infrastructure, registry)

    # Act
    response = await clients[1].delete(f"/api/v1/{path}/{backend.id}")
    get_response = await clients[0].get(f"/api/v1/{path}/{backend.id}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    assert get_response.status_code == 200


@pytest.mark.parametrize(("path", "registry"), [("computes", "compute")])
async def test_platform_user_cannot_read_administrator_registry_details(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], path: str, registry: str
) -> None:
    """Reject registered backend detail reads from non-administrators."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    backend = getattr(infrastructure, registry)

    # Act
    response = await clients[1].get(f"/api/v1/{path}/{backend.id}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


@pytest.mark.parametrize(
    ("path", "registry", "expected_fields", "secret_fields"),
    [
        pytest.param(
            "computes",
            "compute",
            {"gateway_url": "https://gateway.example", "status": "running"},
            ["kubeconfig"],
            id="compute",
        ),
    ],
)
async def test_registry_endpoints_return_registered_backend(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    path: str,
    registry: str,
    expected_fields: dict[str, str],
    secret_fields: list[str],
) -> None:
    """Return each independently registered backend without its secrets."""

    infrastructure = await create_ready_infrastructure()
    backend = getattr(infrastructure, registry)

    get_response = await clients[0].get(f"/api/v1/{path}/{backend.id}")

    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(backend.id)
    assert payload["name"] == backend.name
    assert {field: payload[field] for field in expected_fields} == expected_fields
    assert all(field not in payload for field in secret_fields)
    assert all(str(getattr(backend, secret_field)) not in get_response.text for secret_field in secret_fields)


@pytest.mark.parametrize(
    ("path", "expected_detail"),
    [
        pytest.param("computes", "Compute registry not found", id="compute"),
    ],
)
async def test_registry_endpoint_returns_resource_specific_not_found_error(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], path: str, expected_detail: str
) -> None:
    """Return the resource-specific error when an administrator requests an unknown registry."""

    # Act
    response = await clients[0].get(f"/api/v1/{path}/{uuid4()}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": expected_detail}


@pytest.mark.parametrize(
    ("path", "payload", "expected_item", "create_status"),
    [
        pytest.param(
            "computes",
            {
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
            },
            {
                "gateway_url": "https://gateway.example",
                "status": "creating",
                "database_storage_class": "local-path",
                "database_size_gib": 10,
                "database_instances": 1,
                "storage_class": "block-storage",
                "storage_endpoint": "https://storage.example",
                "storage_size_gib": 100,
                "storage_instances": 3,
            },
            202,
            id="compute",
        ),
    ],
)
async def test_registry_list_returns_ordered_page_and_total(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    path: str,
    payload: dict[str, object],
    expected_item: dict[str, object],
    create_status: int,
) -> None:
    """Return an ordered registry page without credentials."""

    # Arrange
    beta_response = await clients[0].post(f"/api/v1/{path}", json=payload | {"name": "Beta Registry"})
    alpha_response = await clients[0].post(f"/api/v1/{path}", json=payload | {"name": "Alpha Registry"})
    assert alpha_response.status_code == create_status
    assert beta_response.status_code == create_status
    beta_id = beta_response.json()["id"]

    # Act
    response = await clients[0].get(f"/api/v1/{path}?page=2&page_size=1")

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
