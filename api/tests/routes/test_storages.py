import pytest
from uuid import uuid4
from types import SimpleNamespace
from httpx2 import AsyncClient
from fastapi import HTTPException
from factories import create_organization, create_ready_infrastructure
from src.routes.v1 import storages
from unittest.mock import AsyncMock
from src.models.storages import StorageRegistryCreate
from src.models.pagination import Pagination


async def test_storage_handlers_delegate_creation_and_listing() -> None:
    """Create and list storage registries through their persistence service."""

    # Arrange
    session = SimpleNamespace(commit=AsyncMock())
    registry = SimpleNamespace(id=uuid4())
    payload = StorageRegistryCreate(
        name="Storage",
        endpoint_url="https://sos-ch-gva-2.exo.io",
        access_key_id="access-key",
        secret_access_key="secret-key",
    )
    pagination = Pagination()
    original_create = storages.storage.create
    original_fetch_page = storages.storage.fetch_page
    create = AsyncMock(return_value=registry)
    fetch_page = AsyncMock(return_value=([registry], 1))
    storages.storage.create = create
    storages.storage.fetch_page = fetch_page

    try:
        # Act
        created = await storages.create_storage_registry(payload, session)
        page = await storages.list_storage_registries(pagination, session)
    finally:
        storages.storage.create = original_create
        storages.storage.fetch_page = original_fetch_page

    # Assert
    assert created is registry
    assert page == {"items": [registry], "total": 1}
    create.assert_awaited_once_with(
        session, payload.name, payload.endpoint_url, payload.access_key_id, payload.secret_access_key
    )
    fetch_page.assert_awaited_once_with(session, pagination)
    session.commit.assert_awaited_once()


async def test_get_storage_registry_returns_registry_or_not_found_error() -> None:
    """Return the selected storage registry or its exact missing-registry error."""

    # Arrange
    registry_id = uuid4()
    registry = SimpleNamespace(id=registry_id)
    found_session = SimpleNamespace(get=AsyncMock(return_value=registry))
    missing_session = SimpleNamespace(get=AsyncMock(return_value=None))

    # Act
    result = await storages.get_storage_registry(registry_id, found_session)
    with pytest.raises(HTTPException) as exc:
        await storages.get_storage_registry(registry_id, missing_session)

    # Assert
    assert result is registry
    assert exc.value.status_code == 404
    assert exc.value.detail == "Storage registry not found"


async def test_delete_storage_registry_returns_not_found_error() -> None:
    """Return the exact error when deleting a missing storage registry."""

    # Arrange
    session = SimpleNamespace(commit=AsyncMock())
    registry_id = uuid4()
    original_delete = storages.storage.delete
    storages.storage.delete = AsyncMock(return_value=False)

    try:
        # Act
        with pytest.raises(HTTPException) as exc:
            await storages.delete_storage_registry(registry_id, session)
    finally:
        storages.storage.delete = original_delete

    # Assert
    assert exc.value.status_code == 404
    assert exc.value.detail == "Storage registry not found"
    session.commit.assert_not_awaited()


async def test_delete_storage_registry_commits_successful_deletion() -> None:
    """Commit after deleting an unused storage registry."""

    # Arrange
    session = SimpleNamespace(commit=AsyncMock())
    registry_id = uuid4()
    original_delete = storages.storage.delete
    delete = AsyncMock(return_value=True)
    storages.storage.delete = delete

    try:
        # Act
        await storages.delete_storage_registry(registry_id, session)
    finally:
        storages.storage.delete = original_delete

    # Assert
    delete.assert_awaited_once_with(session, registry_id)
    session.commit.assert_awaited_once()


async def test_storage_registry_creation_normalizes_endpoint_url(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Persist and return the canonical Exoscale endpoint URL."""

    # Arrange
    payload = {
        "name": "Normalized storage",
        "endpoint_url": " https://sos-ch-gva-2.exo.io/ ",
        "access_key_id": "storage-access-key",
        "secret_access_key": "storage-secret-key",
    }

    # Act
    response = await clients[0].post("/api/v1/storages", json=payload)

    # Assert
    assert response.status_code == 201
    payload = response.json()
    assert payload["name"] == "Normalized storage"
    assert payload["endpoint_url"] == "https://sos-ch-gva-2.exo.io"


async def test_storage_registry_list_and_detail_omit_credentials(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return paginated storage metadata without provider credentials."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    list_response = await clients[0].get("/api/v1/storages")
    detail_response = await clients[0].get(f"/api/v1/storages/{infrastructure.storage.id}")

    # Assert
    expected_registry = {
        "id": str(infrastructure.storage.id),
        "name": infrastructure.storage.name,
        "endpoint_url": "https://sos-ch-gva-2.exo.io",
    }
    assert list_response.status_code == 200
    assert list_response.json() == {"items": [expected_registry], "total": 1}
    assert detail_response.status_code == 200
    assert detail_response.json() == expected_registry



async def test_storage_registry_deletion_rejects_organization_assignment(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users,
) -> None:
    """Keep an Organization's assigned storage registry available."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    await create_organization(users[1], infrastructure=infrastructure)

    # Act
    response = await clients[0].delete(f"/api/v1/storages/{infrastructure.storage.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Storage registry is used by organizations"}


async def test_storage_registry_deletion_removes_unused_registry(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Delete an unassigned storage registry."""

    # Arrange
    infrastructure = await create_ready_infrastructure()

    # Act
    delete_response = await clients[0].delete(f"/api/v1/storages/{infrastructure.storage.id}")
    detail_response = await clients[0].get(f"/api/v1/storages/{infrastructure.storage.id}")

    # Assert
    assert delete_response.status_code == 204
    assert detail_response.status_code == 404
    assert detail_response.json() == {"detail": "Storage registry not found"}
