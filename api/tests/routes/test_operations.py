from factories import create_organization, create_ready_infrastructure
from src.database import session
from src.environments import env
from src.models.roles import PlatformRoles
from fastapi.testclient import TestClient
from src.database.services import operations
from src.database.models.users import User


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
    operation = (await operations.fetch())[0]

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


async def test_operations_endpoint_enforces_support_access(
    clients: tuple[TestClient, TestClient, TestClient],
    users: tuple[User, User, User],
) -> None:
    """Allow support users to inspect operations while rejecting ordinary users."""

    # Arrange
    owner = users[0]
    support = users[2]
    infrastructure = await create_ready_infrastructure(owner)
    await create_organization(infrastructure, owner)
    operation = (await operations.fetch())[0]
    Session = await session.get_session()
    async with Session() as db_session:
        persisted_support = await db_session.get(User, support.id)
        assert persisted_support is not None
        persisted_support.role = PlatformRoles.support
        await db_session.commit()

    support_client = clients[2]
    ordinary_client = clients[1]

    # Act
    support_response = support_client.get("/api/operations")
    ordinary_response = ordinary_client.get("/api/operations")

    # Assert
    assert support_response.status_code == 200
    assert [item["id"] for item in support_response.json()] == [str(operation.id)]
    assert ordinary_response.status_code == 403
    assert ordinary_response.json() == {"detail": "Permission required"}
