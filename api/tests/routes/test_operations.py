from uuid import uuid4
from types import SimpleNamespace
from httpx2 import AsyncClient
from datetime import timedelta
from factories import queue_operation
from src.routes.v1 import operations as operation_routes
from unittest.mock import AsyncMock
from src.database.session import session_scope
from src.models.pagination import Pagination
from src.database.models.operations import Operation


async def test_list_operations_delegates_pagination_to_operation_service() -> None:
    """Return the reconciliation page supplied by the persistence service."""

    # Arrange
    session = SimpleNamespace()
    pagination = Pagination()
    items = [SimpleNamespace(id=uuid4())]
    original_fetch_page = operation_routes.operations.fetch_page
    fetch_page = AsyncMock(return_value=(items, 1))
    operation_routes.operations.fetch_page = fetch_page

    try:
        # Act
        page = await operation_routes.list_operations(pagination, session)
    finally:
        operation_routes.operations.fetch_page = original_fetch_page

    # Assert
    assert page == {"items": items, "total": 1}
    fetch_page.assert_awaited_once_with(session, pagination)


async def test_operations_endpoint_rejects_anonymous_requests(client: AsyncClient) -> None:
    """Require authentication before exposing reconciliation history."""

    # Act
    response = await client.get("/api/v1/operations")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


async def test_operations_endpoint_rejects_non_administrators(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Require Platform administrator access for reconciliation history."""

    # Act
    response = await clients[1].get("/api/v1/operations")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_operations_endpoint_paginates_history(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Return each reconciliation operation once across paginated history."""

    # Arrange
    older_operation = await queue_operation(target_id=uuid4())
    newer_operation = await queue_operation(target_id=uuid4())

    # Make the expected descending order independent of factory execution timing.
    async with session_scope() as session:
        operation = await session.get(Operation, older_operation.id)
        assert operation is not None
        operation.created_at = newer_operation.created_at - timedelta(seconds=1)
        await session.commit()

    # Act
    first_page = await clients[0].get("/api/v1/operations?page=1&page_size=1")
    second_page = await clients[0].get("/api/v1/operations?page=2&page_size=1")

    # Assert
    assert first_page.status_code == 200
    assert second_page.status_code == 200
    first_payload = first_page.json()
    second_payload = second_page.json()
    assert first_payload["total"] == 2
    assert second_payload["total"] == 2
    assert [item["id"] for item in first_payload["items"]] == [str(newer_operation.id)]
    assert [item["id"] for item in second_payload["items"]] == [str(older_operation.id)]
    assert all(item["failed"] is None for item in [*first_payload["items"], *second_payload["items"]])
