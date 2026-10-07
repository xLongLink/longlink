import pytest
from uuid import UUID
from httpx2 import AsyncClient
from factories import create_compute, fetch_operations, create_organization
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        pytest.param("GET", "computes", None, id="list-computes"),
        pytest.param("POST", "computes", {}, id="create-compute"),
    ],
)
async def test_platform_user_cannot_access_administrator_registries(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], method: str, path: str, payload: dict[str, object] | None
) -> None:
    """Reject Compute registry reads and creation before payload validation."""

    # Act
    response = await clients[1].request(method, f"/api/v1/{path}", json=payload)

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_platform_user_cannot_delete_compute_registry(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Reject registry deletion without modifying the registered backend."""

    # Arrange
    compute = await create_compute()

    # Act
    response = await clients[1].delete(f"/api/v1/computes/{compute.id}")
    list_response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    assert list_response.status_code == 200
    assert str(compute.id) in {item["id"] for item in list_response.json()["items"]}


async def test_compute_list_returns_ordered_page_and_total(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return an ordered registry page without credentials."""

    # Arrange
    expected_item = {
        "gateway_url": "https://gateway.example:443",
        "database_storage_class": "local-path",
        "storage_endpoint": "https://storage.example:443",
    }
    beta = ComputeRegistry(
        name="Beta Registry",
        cluster_uid="beta-cluster",
        kubeconfig={"apiVersion": "v1", "clusters": []},
        storage_access_key="controller",
        storage_secret_key="controller-secret",
        **expected_item,
    )
    alpha = ComputeRegistry(
        name="Alpha Registry",
        cluster_uid="alpha-cluster",
        kubeconfig={"apiVersion": "v1", "clusters": []},
        storage_access_key="controller",
        storage_secret_key="controller-secret",
        **expected_item,
    )
    async with session_scope() as session:
        session.add_all([beta, alpha])
        await session.commit()
    beta_id = str(beta.id)

    # Act
    response = await clients[0].get("/api/v1/computes?page=2&page_size=1")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"items": [{"id": beta_id, "name": "Beta Registry"} | expected_item], "total": 2}


@pytest.mark.parametrize("overrides", [{}, {"database_storage_class": "local-path"}], ids=["discovered", "explicit"])
async def test_compute_registry_creation_redacts_credentials_and_rejects_duplicate_name(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    compute_runtime: None,
    overrides: dict[str, str],
) -> None:
    """Persist an inline-verified Compute without credentials in responses or queued work."""

    # Arrange
    payload = {
        "name": "Ephemeral Compute",
        "storage_endpoint": "https://storage.example",
        "gateway_url": "https://gateway.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {"token": "compute-credential-must-not-leak"}}],
        },
    } | overrides

    # Act
    create_response = await clients[0].post("/api/v1/computes", json=payload)
    created = create_response.json()

    # Assert
    assert create_response.status_code == 201
    assert created["name"] == payload["name"]
    assert created["database_storage_class"] == "local-path"
    assert "kubeconfig" not in created
    assert "compute-credential-must-not-leak" not in create_response.text
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, UUID(created["id"]))
    assert registry is not None
    assert registry.cluster_uid
    assert registry.gateway_certificate == "gateway-certificate"
    assert registry.storage_certificate == "storage-certificate"
    assert registry.storage_access_key == "controller"
    assert registry.storage_secret_key == "controller-secret"
    assert await fetch_operations() == []

    # Reject a duplicate after checking the successful registration's persisted outcome.
    duplicate_response = await clients[0].post("/api/v1/computes", json=payload)
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Compute registry already exists"}


async def test_compute_registry_delete_rejects_assigned_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Keep a Compute registry while an Organization references it."""

    compute = await create_compute()
    await create_organization(users[0], compute=compute)
    registry_id = compute.id

    response = await clients[0].delete(f"/api/v1/computes/{registry_id}")
    list_response = await clients[0].get("/api/v1/computes")

    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry is used by organizations"}
    assert list_response.status_code == 200
    assert str(registry_id) in {item["id"] for item in list_response.json()["items"]}
