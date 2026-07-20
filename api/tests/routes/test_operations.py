from types import SimpleNamespace
from factories import create_organization, create_ready_infrastructure
from src.environments import env
from fastapi.testclient import TestClient
from src.database.services import operations, organizations
from src.database.models.users import User

db = SimpleNamespace(operations=operations, organizations=organizations)


async def test_operations_endpoint_returns_compute_scoped_operations(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Return compute-scoped reconciliation Operations for admin views."""

    # Arrange
    client = clients[0]
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    await create_organization(infrastructure, user)
    operation = (await db.operations.fetch())[0]

    # Act
    response = client.get("/api/operations")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert payload[0]["id"] == str(operation.id)
    assert payload[0]["compute_id"] == str(infrastructure.compute.id)
    assert payload[0]["status"] == operation.status
    assert payload[0]["platform_version"] == env.VERSION
    assert set(payload[0]).isdisjoint(
        {"kind", "revision", "retry_count", "deadline_at", "lease_token", "created_id", "updated_id", "updated_at"}
    )
    assert "organization_id" not in payload[0]
    assert "application_id" not in payload[0]
