import pytest
from httpx2 import AsyncClient
from sqlmodel import select
from factories import create_ready_infrastructure
from src.database.session import session_scope
from src.database.models.organizations import Organization


@pytest.mark.parametrize("origin", ["", "https://attacker.example"])
async def test_authenticated_organization_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    origin: str,
) -> None:
    """Reject unsafe cookie-authenticated writes before the route can persist data."""

    # Arrange
    await create_ready_infrastructure()

    # Act
    response = await clients[0].post("/api/v1/organizations", json={"name": "acme"}, headers={"origin": origin})

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        result = await session.execute(select(Organization))
        organizations = result.scalars().all()
    assert organizations == []
