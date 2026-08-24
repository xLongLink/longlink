import pytest
from uuid import uuid4
from types import SimpleNamespace
from httpx2 import AsyncClient
from fastapi import HTTPException
from factories import (
    create_compute,
    claim_operation,
    queue_operation,
    fetch_operations,
    complete_operation,
    create_organization,
    create_ready_infrastructure,
)
from src.routes.v1 import computes
from unittest.mock import AsyncMock
from src.models.computes import ComputeRegistryCreate
from src.models.operations import OperationKind
from src.models.pagination import Pagination


async def test_compute_handlers_delegate_creation_and_listing() -> None:
    """Create and list Compute registries through their persistence service."""

    # Arrange
    session = SimpleNamespace(commit=AsyncMock())
    registry = SimpleNamespace(id=uuid4())
    payload = ComputeRegistryCreate(name="Compute", kubeconfig="apiVersion: v1\nclusters: []\n")
    pagination = Pagination()
    original_create = computes.compute.create
    original_fetch_page = computes.compute.fetch_page
    create = AsyncMock(return_value=registry)
    fetch_page = AsyncMock(return_value=([registry], 1))
    computes.compute.create = create
    computes.compute.fetch_page = fetch_page

    try:
        # Act
        created = await computes.create_compute_registry(payload, session)
        page = await computes.list_compute_registries(pagination, session)
    finally:
        computes.compute.create = original_create
        computes.compute.fetch_page = original_fetch_page

    # Assert
    assert created is registry
    assert page == {"items": [registry], "total": 1}
    create.assert_awaited_once_with(session, payload.name, payload.kubeconfig)
    fetch_page.assert_awaited_once_with(session, pagination)
    session.commit.assert_awaited_once()


async def test_get_compute_registry_returns_registry_or_not_found_error() -> None:
    """Return the selected Compute registry or its exact missing-registry error."""

    # Arrange
    registry_id = uuid4()
    registry = SimpleNamespace(id=registry_id)
    found_session = SimpleNamespace(get=AsyncMock(return_value=registry))
    missing_session = SimpleNamespace(get=AsyncMock(return_value=None))

    # Act
    result = await computes.get_compute_registry(registry_id, found_session)
    with pytest.raises(HTTPException) as exc:
        await computes.get_compute_registry(registry_id, missing_session)

    # Assert
    assert result is registry
    assert exc.value.status_code == 404
    assert exc.value.detail == "Compute registry not found"


async def test_delete_compute_registry_returns_not_found_error() -> None:
    """Return the exact error when deleting a missing Compute registry."""

    # Arrange
    session = SimpleNamespace(commit=AsyncMock())
    registry_id = uuid4()
    original_delete = computes.compute.delete
    computes.compute.delete = AsyncMock(return_value=False)

    try:
        # Act
        with pytest.raises(HTTPException) as exc:
            await computes.delete_compute_registry(registry_id, session)
    finally:
        computes.compute.delete = original_delete

    # Assert
    assert exc.value.status_code == 404
    assert exc.value.detail == "Compute registry not found"
    session.commit.assert_not_awaited()


async def test_delete_compute_registry_commits_successful_deletion() -> None:
    """Commit after deleting an unused Compute registry."""

    # Arrange
    session = SimpleNamespace(commit=AsyncMock())
    registry_id = uuid4()
    original_delete = computes.compute.delete
    delete = AsyncMock(return_value=True)
    computes.compute.delete = delete

    try:
        # Act
        await computes.delete_compute_registry(registry_id, session)
    finally:
        computes.compute.delete = original_delete

    # Assert
    delete.assert_awaited_once_with(session, registry_id)
    session.commit.assert_awaited_once()


async def test_compute_registry_creation_queues_lifecycle_operation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Queue one Compute creation operation when registering a Compute."""

    # Arrange
    payload = {"name": "Queued Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"}

    # Act
    response = await clients[0].post("/api/v1/computes", json=payload)

    # Assert
    assert response.status_code == 202
    operations = await fetch_operations()
    assert len(operations) == 1
    assert operations[0].kind == OperationKind.compute_create
    assert str(operations[0].target_id) == response.json()["id"]
    assert operations[0].finished_at is None


async def test_compute_registry_list_and_detail_expose_only_administrator_metadata(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return paginated Compute metadata without its Kubernetes credentials."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    list_response = await clients[0].get("/api/v1/computes")
    detail_response = await clients[0].get(f"/api/v1/computes/{infrastructure.compute.id}")

    # Assert
    expected_registry = {
        "id": str(infrastructure.compute.id),
        "name": infrastructure.compute.name,
        "gateway_url": "https://gateway.example",
        "status": "running",
    }
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [expected_registry], "total": 1}
    assert detail_response.status_code == 200
    assert detail_response.json() == expected_registry


async def test_compute_registry_deletion_rejects_organization_assignment(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users,
) -> None:
    """Keep a Compute registry assigned to an Organization available."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[1], infrastructure=infrastructure)

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{infrastructure.compute.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry is used by organizations"}



async def test_compute_registry_deletion_rejects_pending_lifecycle_operation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Retain a Compute registry while its lifecycle operation is pending."""

    # Arrange
    compute = await create_compute()
    await queue_operation(target_id=compute.id)

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{compute.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Compute registry has unfinished lifecycle operation"}


async def test_compute_registry_deletes_registration_after_completed_lifecycle(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Remove a Compute registration after its lifecycle Operation completes."""

    # Arrange
    compute = await create_compute()
    await queue_operation(target_id=compute.id)
    claimed = await claim_operation()
    assert claimed is not None
    await complete_operation(claimed.id)

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{compute.id}")
    get_response = await clients[0].get(f"/api/v1/computes/{compute.id}")

    # Assert
    assert response.status_code == 204
    assert get_response.status_code == 404
    assert get_response.json() == {"detail": "Compute registry not found"}


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
