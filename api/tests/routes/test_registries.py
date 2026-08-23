import pytest
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


async def test_storage_registry_list_returns_ordered_page_and_total(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return an ordered storage registry page without provider credentials."""

    # Arrange
    alpha_response = await clients[0].post(
        "/api/v1/storages",
        json={
            "name": "Alpha Storage",
            "endpoint_url": "https://sos-ch-gva-2.exo.io",
            "access_key_id": "alpha-key",
            "secret_access_key": "alpha-secret",
        },
    )
    beta_response = await clients[0].post(
        "/api/v1/storages",
        json={
            "name": "Beta Storage",
            "endpoint_url": "https://sos-ch-gva-2.exo.io",
            "access_key_id": "beta-key",
            "secret_access_key": "beta-secret",
        },
    )
    assert alpha_response.status_code == 201
    assert beta_response.status_code == 201
    beta_id = beta_response.json()["id"]

    # Act
    response = await clients[0].get("/api/v1/storages?page=2&page_size=1")

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "id": beta_id,
                "name": "Beta Storage",
                "endpoint_url": "https://sos-ch-gva-2.exo.io",
            }
        ],
        "total": 2,
    }


@pytest.mark.parametrize(
    ("path", "payload", "secret_fields", "duplicate_error"),
    [
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
            id="storage",
        ),
    ],
)
async def test_registry_create_duplicate_and_delete(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    path: str,
    payload: dict[str, str | int],
    secret_fields: list[str],
    duplicate_error: str,
) -> None:
    """Create, reject duplicate registration, and delete each unassigned registry type."""

    create_response = await clients[0].post(f"/api/v1/{path}", json=payload)
    duplicate_response = await clients[0].post(f"/api/v1/{path}", json=payload)
    created = create_response.json()
    registry_id = created["id"]
    delete_response = await clients[0].delete(f"/api/v1/{path}/{registry_id}")
    get_response = await clients[0].get(f"/api/v1/{path}/{registry_id}")

    assert create_response.status_code == 201
    assert created["name"] == payload["name"]
    assert all(field not in created and str(payload[field]) not in create_response.text for field in secret_fields)
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": duplicate_error}
    assert delete_response.status_code == 204
    assert get_response.status_code == 404


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
