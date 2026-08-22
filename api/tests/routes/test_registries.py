import pytest
from httpx2 import AsyncClient
from factories import create_organization, create_ready_infrastructure
from src.database.models.users import User


@pytest.mark.parametrize("path", ["computes", "databases", "operations", "storages", "users"])
async def test_platform_user_cannot_access_administrator_collections(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], path: str
) -> None:
    """Reject Platform users from every administrator collection."""

    response = await clients[1].get(f"/api/v1/{path}")

    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


@pytest.mark.parametrize(
    ("path", "registry", "expected_fields", "secret_fields", "secret_values"),
    [
        pytest.param(
            "computes",
            "compute",
            {"gateway_url": "https://gateway.example", "status": "running"},
            ["kubeconfig", "proxy_secret"],
            [],
            id="compute",
        ),
        pytest.param(
            "databases",
            "database",
            {"host": "database.example", "sslmode": "disable"},
            ["password"],
            [],
            id="database",
        ),
        pytest.param(
            "storages",
            "storage",
            {"endpoint_url": "https://sos-ch-gva-2.exo.io"},
            ["access_key_id", "secret_access_key"],
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
    secret_values: list[str],
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
    for secret_field in secret_values:
        assert str(getattr(backend, secret_field)) not in list_response.text
        assert str(getattr(backend, secret_field)) not in get_response.text


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
