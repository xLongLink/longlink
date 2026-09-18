import pytest
from src import auth
from uuid import uuid4
from httpx2 import AsyncClient
from conftest import FakeKubernetes
from factories import (
    create_compute,
    create_solution,
    fetch_operations,
    create_organization,
    create_ready_compute,
)
from src.models.operations import OperationKind
from src.database.models.users import User


async def test_compute_list_reports_live_package_versions(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Resolve live Compute versions in parallel without failing unreachable clusters."""

    # Arrange
    compute = await create_compute()

    class FakeConfigMap:
        """Expose one installed package version."""

        def __init__(self, name: str, namespace: str, api: object) -> None:
            """Ignore the selected release coordinates."""

        async def refresh(self) -> None:
            """Return the current observation."""

        raw = {"data": {"contract": "1", "platform_version": "v9.9.9"}}

    class ReleaseKubernetes(FakeKubernetes):
        """Expose the release boundary without opening a cluster connection."""

        def __init__(self, kubeconfig: object) -> None:
            """Ignore the stored connection settings."""

            super().__init__()

        async def api(self) -> object:
            """Return the release boundary."""

            return object()

    monkeypatch.setattr("src.routes.v1.computes.Kubernetes", ReleaseKubernetes)
    monkeypatch.setattr("src.kubernetes.gateway.ConfigMap", FakeConfigMap)

    # Act
    response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 200
    items = [item for item in response.json()["items"] if item["id"] == str(compute.id)]
    assert len(items) == 1
    assert items[0]["live_version"] == "v9.9.9"


async def test_compute_list_omits_live_version_when_cluster_unreachable(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return stored Compute overview with a missing version when the cluster is unreachable."""

    # Arrange
    compute = await create_compute()

    async def unreachable_version(cluster: object) -> str | None:
        """Report the unreachable release boundary."""

        raise LookupError("release unavailable")

    monkeypatch.setattr("src.routes.v1.computes.gateway.read_package_version", unreachable_version)

    # Act
    response = await clients[0].get("/api/v1/computes")

    # Assert
    assert response.status_code == 200
    items = [item for item in response.json()["items"] if item["id"] == str(compute.id)]
    assert len(items) == 1
    assert items[0]["live_version"] is None


async def test_compute_registry_creation_registers_running_compute_without_queuing_work(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Register an inline-verified Compute as immediately assignable."""

    # Arrange
    payload = {
        "name": "Queued Compute",
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {}}],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 201
    assert response.json()["status"] == "running"
    assert await fetch_operations() == []


async def test_compute_registry_creation_rejects_incompatible_package(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return 422 without persisting when inline verification rejects the Compute package."""

    # Arrange
    async def incompatible_gateway(
        _cluster: object, _url: str, _certificate: str | None, **_kwargs: object
    ) -> None:
        """Report the incompatible Compute package."""

        raise ValueError("Compute package is incompatible; deploy a supported Compute package")

    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", incompatible_gateway)
    payload = {
        "name": "Incompatible Compute",
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {}}],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 422
    assert await fetch_operations() == []
    list_response = await clients[0].get("/api/v1/computes")
    assert "Incompatible Compute" not in {item["name"] for item in list_response.json()["items"]}


async def test_compute_registry_creation_rejects_unready_infrastructure(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return 503 without persisting when shared infrastructure is unavailable."""

    # Arrange
    async def unavailable_gateway(
        _cluster: object, _url: str, _certificate: str | None, **_kwargs: object
    ) -> None:
        """Report the unavailable gateway."""

        raise RuntimeError("gateway unavailable")

    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", unavailable_gateway)
    payload = {
        "name": "Unready Compute",
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "storage_endpoint": "https://storage.example",
        "kubeconfig": {
            "clusters": [{"name": "cluster", "cluster": {}}],
            "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
            "current-context": "context",
            "users": [{"name": "user", "user": {}}],
        },
    }

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 503
    assert await fetch_operations() == []
    list_response = await clients[0].get("/api/v1/computes")
    assert "Unready Compute" not in {item["name"] for item in list_response.json()["items"]}


async def test_compute_registry_deletes_unused_registration(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
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


async def test_compute_registry_deletion_rejects_unknown_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return the Compute-specific error when deleting an unknown registration."""

    # Arrange
    registry_id = uuid4()

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{registry_id}")

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Compute registry not found"}


async def test_deployment_token_rotates_compute_endpoints(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Rotate one registered Compute without using an administrator browser session."""

    # Arrange
    compute = await create_ready_compute()
    token = "deployment-token-that-is-long-enough"
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", token)

    # Act
    response = await client.put(
        "/api/v1/deployment/computes/endpoints",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cluster_uid": compute.cluster_uid,
            "gateway_url": "https://new-gateway.example",
            "storage_endpoint": "https://new-storage.example",
        },
    )

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "running"
    assert body["gateway_url"] == "https://new-gateway.example"
    assert body["storage_endpoint"] == "https://new-storage.example"
    assert await fetch_operations() == []


async def test_deployment_token_rotation_requeues_dependent_solution_deployments(
    client: AsyncClient, users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reapply workloads after rotating Compute endpoints."""

    # Arrange
    compute = await create_ready_compute()
    organization = await create_organization(users[0], compute=compute)
    solution = await create_solution(organization)
    assert solution.desired_revision_id is not None
    token = "deployment-token-that-is-long-enough"
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", token)

    # Act
    response = await client.put(
        "/api/v1/deployment/computes/endpoints",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cluster_uid": compute.cluster_uid,
            "gateway_url": "https://new-gateway.example",
            "storage_endpoint": "https://new-storage.example",
        },
    )

    # Assert
    assert response.status_code == 200
    operations = await fetch_operations()
    assert (OperationKind.solution_deploy, solution.desired_revision_id) in [
        (operation.kind, operation.target_id) for operation in operations
    ]


async def test_deployment_token_rejects_rotation_when_infrastructure_unavailable(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Retain existing endpoints when rotated infrastructure is unavailable."""

    # Arrange
    compute = await create_ready_compute()
    token = "deployment-token-that-is-long-enough"
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", token)

    async def unavailable_gateway(
        _cluster: object, _url: str, _certificate: str | None, **_kwargs: object
    ) -> None:
        """Report the unavailable gateway."""

        raise RuntimeError("gateway unavailable")

    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", unavailable_gateway)

    # Act
    response = await client.put(
        "/api/v1/deployment/computes/endpoints",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cluster_uid": compute.cluster_uid,
            "gateway_url": "https://new-gateway.example",
            "storage_endpoint": "https://new-storage.example",
        },
    )

    # Assert
    assert response.status_code == 503
    assert response.json() == {
        "detail": "Compute infrastructure is unavailable; verify endpoints, credentials, and certificates"
    }
    assert await fetch_operations() == []


async def test_deployment_endpoints_return_not_found_when_token_unset(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Hide deployment endpoints when no machine credential is configured."""

    # Arrange
    compute = await create_compute()
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", None)

    # Act
    response = await client.put(
        "/api/v1/deployment/computes/endpoints",
        headers={"Authorization": "Bearer deployment-token-that-is-long-enough"},
        json={
            "cluster_uid": compute.cluster_uid,
            "gateway_url": "https://new-gateway.example",
            "storage_endpoint": "https://new-storage.example",
        },
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Not found"}
    assert await fetch_operations() == []


@pytest.mark.parametrize(
    "authorization",
    [
        pytest.param(None, id="missing-header"),
        pytest.param("Token deployment-token-that-is-long-enough", id="wrong-scheme"),
        pytest.param("Bearer wrong-deployment-token-value", id="wrong-token"),
    ],
)
async def test_deployment_endpoints_reject_invalid_authorization_without_queuing_work(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch, authorization: str | None
) -> None:
    """Reject missing, non-Bearer, and wrong machine credentials without side effects."""

    # Arrange
    compute = await create_compute()
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", "deployment-token-that-is-long-enough")
    headers = {"Authorization": authorization} if authorization is not None else {}

    # Act
    response = await client.put(
        "/api/v1/deployment/computes/endpoints",
        headers=headers,
        json={
            "cluster_uid": compute.cluster_uid,
            "gateway_url": "https://new-gateway.example",
            "storage_endpoint": "https://new-storage.example",
        },
    )

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}
    assert await fetch_operations() == []


async def test_deployment_token_rejects_unknown_cluster_uid_without_queuing_work(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return the Compute-specific error for an unknown physical cluster identity."""

    # Arrange
    token = "deployment-token-that-is-long-enough"
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", token)

    # Act
    response = await client.put(
        "/api/v1/deployment/computes/endpoints",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "cluster_uid": "unknown-cluster",
            "gateway_url": "https://new-gateway.example",
            "storage_endpoint": "https://new-storage.example",
        },
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Compute registry not found"}
    assert await fetch_operations() == []


async def test_deployment_compute_returns_status_for_valid_token(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return deployment-visible Compute status without a browser session."""

    # Arrange
    compute = await create_ready_compute()
    token = "deployment-token-that-is-long-enough"
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", token)

    # Act
    response = await client.get(
        f"/api/v1/deployment/computes/{compute.cluster_uid}",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Assert
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(compute.id)
    assert body["gateway_url"] == compute.gateway_url
    assert await fetch_operations() == []


async def test_deployment_compute_returns_not_found_when_token_unset(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Hide the deployment Compute lookup when no machine credential is configured."""

    # Arrange
    compute = await create_compute()
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", None)

    # Act
    response = await client.get(
        f"/api/v1/deployment/computes/{compute.cluster_uid}",
        headers={"Authorization": "Bearer deployment-token-that-is-long-enough"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Not found"}
    assert await fetch_operations() == []


@pytest.mark.parametrize(
    "authorization",
    [
        pytest.param(None, id="missing-header"),
        pytest.param("Token deployment-token-that-is-long-enough", id="wrong-scheme"),
        pytest.param("Bearer wrong-deployment-token-value", id="wrong-token"),
    ],
)
async def test_deployment_compute_rejects_invalid_authorization_without_side_effects(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch, authorization: str | None
) -> None:
    """Reject missing, non-Bearer, and wrong machine credentials without side effects."""

    # Arrange
    compute = await create_compute()
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", "deployment-token-that-is-long-enough")
    headers = {"Authorization": authorization} if authorization is not None else {}

    # Act
    response = await client.get(
        f"/api/v1/deployment/computes/{compute.cluster_uid}",
        headers=headers,
    )

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}
    assert await fetch_operations() == []


async def test_deployment_compute_rejects_unknown_cluster_uid_without_side_effects(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Return the Compute-specific error for an unknown physical cluster identity."""

    # Arrange
    token = "deployment-token-that-is-long-enough"
    monkeypatch.setattr(auth.env, "DEPLOYMENT_TOKEN", token)

    # Act
    response = await client.get(
        "/api/v1/deployment/computes/unknown-cluster",
        headers={"Authorization": f"Bearer {token}"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Compute registry not found"}
    assert await fetch_operations() == []
