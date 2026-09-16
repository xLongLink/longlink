import pytest
from httpx2 import AsyncClient
from sqlmodel import select
from factories import create_organization, create_ready_compute
from sqlalchemy import func
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.solutions import Solution
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


@pytest.mark.parametrize("origin", [None, "", "https://attacker.example"])
async def test_authenticated_profile_update_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    origin: str | None,
) -> None:
    """Reject cookie-authenticated profile writes before the route can persist data."""

    # Arrange
    current = await clients[0].get("/api/v1/me")
    original_name = current.json()["name"]

    # Remove the client's trusted default header for the missing-Origin case.
    if origin is None:
        clients[0].headers.pop("origin")

    # Act
    response = await clients[0].patch(
        "/api/v1/me",
        json={"name": "attacker-name"},
        headers={} if origin is None else {"origin": origin},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        persisted = await session.get(User, users[0].id)
    assert persisted is not None
    assert persisted.name == original_name


@pytest.mark.parametrize("origin", [None, "https://attacker.example"])
async def test_authenticated_solution_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    origin: str | None,
) -> None:
    """Reject cookie-authenticated solution writes before the route can persist data."""

    # Arrange
    organization = await create_organization(users[0])

    # Remove the client's trusted default header for the missing-Origin case.
    if origin is None:
        clients[0].headers.pop("origin")

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
        headers={} if origin is None else {"origin": origin},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        count = await session.scalar(
            select(func.count()).select_from(Solution).where(Solution.organization_id == organization.id)
        )
    assert count == 0
