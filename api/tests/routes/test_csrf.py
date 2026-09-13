import pytest
from httpx2 import AsyncClient
from sqlmodel import select
from factories import create_ready_compute
from src.database.session import session_scope
from src.database.models.organizations import Organization


@pytest.mark.parametrize("origin", [None, "", "https://attacker.example"])
async def test_authenticated_organization_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    origin: str | None,
) -> None:
    """Reject unsafe cookie-authenticated writes before the route can persist data."""

    # Arrange
    await create_ready_compute()

    # Remove the client's trusted default header for the missing-Origin case.
    if origin is None:
        clients[0].headers.pop("origin")

    # Act
    response = await clients[0].post(
        "/api/v1/organizations",
        json={"name": "acme"},
        headers={} if origin is None else {"origin": origin},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        result = await session.execute(select(Organization))
        organizations = result.scalars().all()
    assert organizations == []
