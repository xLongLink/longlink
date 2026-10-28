import pytest
from uuid import UUID, uuid4
from httpx2 import AsyncClient
from conftest import RegistryKubernetes
from factories import create_compute, fetch_operations, create_organization
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry


@pytest.mark.parametrize(("method", "payload"), [("GET", None), ("POST", {})])
async def test_platform_user_cannot_access_administrator_computes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], method: str, payload: dict[str, object] | None
) -> None:
    """Reject Compute registry reads and creation before payload validation."""

    # Act
    response = await clients[1].request(method, "/api/v1/computes", json=payload)

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


async def test_compute_list_returns_ordered_page_and_total(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
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

    # Insert a second registry to exercise response ordering and filtering.
    alpha = ComputeRegistry(
        name="Alpha Registry",
        cluster_uid="alpha-cluster",
        kubeconfig={"apiVersion": "v1", "clusters": []},
        storage_access_key="controller",
        storage_secret_key="controller-secret",
        **expected_item,
    )
    async with session_scope() as session:

        # Persist fixtures out of display order to exercise the API's ordering.
        session.add_all([beta, alpha])
        await session.commit()
    beta_id = str(beta.id)

    # Act
    response = await clients[0].get("/api/v1/computes?page=2&page_size=1")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"items": [{"id": beta_id, "name": "Beta Registry"} | expected_item], "total": 2}


async def test_compute_registry_creation_redacts_credentials_and_rejects_duplicate_name(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], compute_runtime: None
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
    }

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

    # Verified gateway and storage trust material must survive persistence.
    assert registry.gateway_certificate == "gateway-certificate"
    assert registry.storage_certificate == "storage-certificate"
    assert registry.storage_access_key == "controller"
    assert registry.storage_secret_key == "controller-secret"
    assert await fetch_operations() == []

    # Reject a duplicate after checking the successful registration's persisted outcome.
    duplicate_response = await clients[0].post("/api/v1/computes", json=payload)
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Compute registry already exists"}


async def test_create_rejects_duplicate_compute_clusters(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch, compute_runtime: None
) -> None:
    """Translate duplicate physical clusters into the stable HTTP conflict."""

    # Arrange a single physical cluster behind differently named registrations.
    class FixedClusterKubernetes(RegistryKubernetes):
        """Reuse one physical cluster identity without external Kubernetes I/O."""

        async def cluster_uid(self) -> str:
            """Return the same physical cluster identity for each registration."""

            return "cluster-uid"

    monkeypatch.setattr("src.routes.v1.admin.computes.Kubernetes", FixedClusterKubernetes)
    payload = {
        "name": "Duplicate Compute",
        "kubeconfig": {
            "apiVersion": "v1",
            "clusters": [{"name": "cluster", "cluster": {"server": "https://kubernetes.example"}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {"token": "secret"}}],
        },
        "gateway_url": "https://gateway.example:443",
        "storage_endpoint": "https://storage.example:443",
    }
    create_response = await clients[0].post("/api/v1/computes", json=payload)
    assert create_response.status_code == 201

    # Act and assert the physical identity conflicts even when the name differs.
    duplicate_response = await clients[0].post("/api/v1/computes", json=payload | {"name": "Cluster Alias"})
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Compute registry already exists"}


async def test_compute_registry_delete_rejects_assigned_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Keep a Compute registry while an Organization references it."""

    # Arrange
    compute = await create_compute()
    await create_organization(users[0], compute=compute)
    registry_id = compute.id

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{registry_id}")
    list_response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry is used by organizations"}
    assert list_response.status_code == 200
    assert str(registry_id) in {item["id"] for item in list_response.json()["items"]}


async def test_compute_registry_rejects_exec_authentication_before_constructing_kubernetes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject executable kubeconfig credentials before any cluster access."""

    # Arrange
    def unexpected_kubernetes(*_args: object) -> object:
        """Reject cluster construction after invalid request validation."""

        raise AssertionError("Kubernetes must not be constructed")

    monkeypatch.setattr("src.routes.v1.admin.computes.Kubernetes", unexpected_kubernetes)
    payload = {
        "name": "Unsafe Compute",
        "gateway_url": "https://gateway.example",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {"exec": {"apiVersion": "client.authentication.k8s.io/v1", "command": "untrusted"}}}],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid request. Please check your input and try again."}
    assert await fetch_operations() == []


async def test_compute_registry_creation_rejects_failed_inline_verification(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch, compute_runtime: None
) -> None:
    """Return 503 without persistence when inline verification fails."""

    # Arrange
    async def failed_gateway(_cluster: object, _url: str, _certificate: str | None, **_kwargs: object) -> None:
        """Report inline verification failure."""

        raise RuntimeError("gateway unavailable")

    monkeypatch.setattr("src.routes.v1.admin.computes.gateway.verify", failed_gateway)
    name = "Unready Compute"
    payload = {
        "name": name,
        "gateway_url": "https://gateway.example",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            # Keep the kubeconfig structurally valid so the intended boundary is exercised.
            "users": [{"name": "user", "user": {}}],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 503
    assert await fetch_operations() == []
    list_response = await clients[0].get("/api/v1/computes")
    assert list_response.json()["total"] == 0
    assert name not in {item["name"] for item in list_response.json()["items"]}


async def test_compute_registry_deletes_unused_registration(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Remove a Compute registration without changing its cluster."""

    # Arrange
    compute = await create_compute()

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{compute.id}")
    list_response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 204
    assert list_response.status_code == 200
    assert str(compute.id) not in {item["id"] for item in list_response.json()["items"]}


async def test_compute_registry_deletion_rejects_unknown_registry(clients: tuple[AsyncClient, AsyncClient, AsyncClient]) -> None:
    """Return the Compute-specific error when deleting an unknown registration."""

    # Arrange
    registry_id = uuid4()

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{registry_id}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Compute registry not found"}
