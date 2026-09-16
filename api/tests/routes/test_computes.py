import pytest
from src import auth
from uuid import uuid4
from httpx2 import AsyncClient
from factories import (
    create_compute,
    claim_operation,
    queue_operation,
    fetch_operations,
    complete_operation,
)
from src.models.operations import OperationKind


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

    class FakeKubernetes:
        """Expose the release boundary without opening a cluster connection."""

        def __init__(self, kubeconfig: object) -> None:
            """Ignore the stored connection settings."""

        async def __aenter__(self) -> "FakeKubernetes":
            """Enter the release lifetime."""

            return self

        async def __aexit__(self, *args: object) -> None:
            """Close the release lifetime."""

        async def api(self) -> object:
            """Return the release boundary."""

            return object()

    monkeypatch.setattr("src.routes.v1.computes.Kubernetes", FakeKubernetes)
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


async def test_compute_registry_creation_queues_validation_operation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Queue one Compute validation operation when registering a Compute."""

    # Arrange
    payload = {
        "name": "Queued Compute",
        "bucket_size_bytes": 1073741824,
        "gateway_url": "https://gateway.example",
        "database_storage_class": "local-path",
        "storage_endpoint": "https://storage.example",
        "storage_access_key": "controller",
        "storage_secret_key": "controller-secret",
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
    assert response.status_code == 202
    operations = await fetch_operations()
    assert len(operations) == 1
    assert operations[0].kind == OperationKind.compute_validate
    assert str(operations[0].target_id) == response.json()["id"]
    assert operations[0].finished_at is None


async def test_compute_registry_deletion_rejects_pending_validation_operation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Retain a Compute registry while its validation operation is pending."""

    # Arrange
    compute = await create_compute()
    await queue_operation(target_id=compute.id)

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{compute.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry has unfinished validation operation"}


async def test_compute_registry_deletes_registration_after_completed_validation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Remove a Compute registration after its validation Operation completes."""

    # Arrange
    compute = await create_compute()
    await queue_operation(target_id=compute.id)
    claimed = await claim_operation()
    assert claimed is not None
    await complete_operation(claimed.id)

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
    compute = await create_compute()
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
    assert response.status_code == 202
    assert response.json()["status"] == "creating"
    operations = await fetch_operations()
    assert len(operations) == 1
    assert operations[0].kind == OperationKind.compute_validate
    assert operations[0].target_id == compute.id


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


async def test_deployment_token_rejects_rotation_while_validation_is_pending(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Retain existing endpoints while Compute validation is still pending."""

    # Arrange
    compute = await create_compute()
    await queue_operation(target_id=compute.id)
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
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute validation is in progress"}
    assert len(await fetch_operations()) == 1
