import pytest
from uuid import uuid4
from httpx2 import AsyncClient
from factories import create_organization, create_ready_infrastructure
from src.database.models.users import User


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        pytest.param("GET", "computes", None, id="list-computes"),
        pytest.param("GET", "databases", None, id="list-databases"),
        pytest.param("GET", "storages", None, id="list-storages"),
        pytest.param("GET", "users", None, id="list-users"),
        pytest.param("POST", "computes", {}, id="create-compute"),
        pytest.param("POST", "databases", {}, id="create-database"),
        pytest.param("POST", "storages", {}, id="create-storage"),
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


@pytest.mark.parametrize(("path", "registry"), [("computes", "compute"), ("databases", "database"), ("storages", "storage")])
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
        pytest.param(
            "databases",
            "database",
            {"host": "database.example", "sslmode": "disable"},
            ["password"],
            id="database",
        ),
        pytest.param(
            "storages",
            "storage",
            {"endpoint_url": "https://sos-ch-gva-2.exo.io"},
            ["access_key_id", "secret_access_key"],
            id="storage",
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

    list_response = await clients[0].get(f"/api/v1/{path}")
    get_response = await clients[0].get(f"/api/v1/{path}/{backend.id}")

    assert list_response.status_code == 200
    assert str(backend.id) in {item["id"] for item in list_response.json()["items"]}
    assert get_response.status_code == 200
    payload = get_response.json()
    assert payload["id"] == str(backend.id)
    assert payload["name"] == backend.name
    assert {field: payload[field] for field in expected_fields} == expected_fields
    assert all(field not in payload for field in secret_fields)
    assert all(
        str(getattr(backend, secret_field)) not in response.text
        for secret_field in secret_fields
        for response in (list_response, get_response)
    )


@pytest.mark.parametrize(
    ("path", "expected_detail"),
    [
        pytest.param("computes", "Compute registry not found", id="compute"),
        pytest.param("databases", "Database registry not found", id="database"),
        pytest.param("storages", "Storage registry not found", id="storage"),
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
            {"kubeconfig": "apiVersion: v1\nclusters: []\n"},
            {"gateway_url": None, "status": "creating"},
            202,
            id="compute",
        ),
        pytest.param(
            "databases",
            {"host": "database.example", "port": 5432, "username": "admin", "password": "secret", "sslmode": "disable"},
            {"host": "database.example", "port": 5432, "sslmode": "disable", "username": "admin"},
            201,
            id="database",
        ),
        pytest.param(
            "storages",
            {"endpoint_url": "https://sos-ch-gva-2.exo.io", "access_key_id": "key", "secret_access_key": "secret"},
            {"endpoint_url": "https://sos-ch-gva-2.exo.io"},
            201,
            id="storage",
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
    alpha_response = await clients[0].post(f"/api/v1/{path}", json=payload | {"name": "Alpha Registry"})
    beta_response = await clients[0].post(f"/api/v1/{path}", json=payload | {"name": "Beta Registry"})
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
            {"name": "Ephemeral Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
            ["kubeconfig"],
            "Compute registry already exists",
            202,
            id="compute",
        ),
        pytest.param(
            "databases",
            {
                "name": "Ephemeral Database",
                "host": "database.example",
                "port": 5432,
                "username": "admin",
                "password": "secret",
                "sslmode": "disable",
            },
            ["password"],
            "Database registry already exists",
            201,
            id="database",
        ),
        pytest.param(
            "storages",
            {
                "name": "Ephemeral Storage",
                "endpoint_url": "https://sos-ch-gva-2.exo.io",
                "access_key_id": "key",
                "secret_access_key": "secret",
            },
            ["access_key_id", "secret_access_key"],
            "Storage registry already exists",
            201,
            id="storage",
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


@pytest.mark.parametrize(("path", "registry"), [("databases", "database"), ("storages", "storage")])
async def test_registry_deletes_unused_registration(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], path: str, registry: str
) -> None:
    """Delete an unassigned registry and reject a repeated deletion."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    registry_id = getattr(infrastructure, registry).id

    # Act
    delete_response = await clients[0].delete(f"/api/v1/{path}/{registry_id}")
    repeat_delete_response = await clients[0].delete(f"/api/v1/{path}/{registry_id}")

    # Assert
    assert delete_response.status_code == 204
    assert repeat_delete_response.status_code == 404


@pytest.mark.parametrize(
    ("path", "registry", "error"),
    [
        pytest.param("computes", "compute", "Compute registry is used by organizations", id="compute"),
        pytest.param("databases", "database", "Database registry is used by organizations", id="database"),
        pytest.param("storages", "storage", "Storage registry is used by organizations", id="storage"),
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

    assert response.status_code == 409
    assert response.json() == {"detail": error}
