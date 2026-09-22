import pytest
from httpx2 import AsyncClient
from sqlmodel import select
from factories import create_compute, fetch_operations, create_organization
from sqlalchemy import func
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


@pytest.mark.parametrize("origin", [None, "", "https://attacker.example"])
async def test_authenticated_organization_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    origin: str | None,
) -> None:
    """Reject unsafe cookie-authenticated writes before the route can persist data."""

    # Arrange
    await create_compute()

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
        count = await session.scalar(select(func.count()).select_from(Solution).where(Solution.organization_id == organization.id))
    assert count == 0


@pytest.mark.parametrize("origin", [None, "", "https://attacker.example"])
async def test_authenticated_compute_creation_rejects_untrusted_origin_before_verification(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    monkeypatch: pytest.MonkeyPatch,
    origin: str | None,
) -> None:
    """Reject cookie-authenticated Compute writes before gateway verification."""

    # Arrange
    async def unexpected_verify(*_args: object, **_kwargs: object) -> None:
        """Fail if an untrusted Compute write reaches gateway verification."""

        raise AssertionError("untrusted Compute write must not verify infrastructure")

    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", unexpected_verify)

    # Remove the client's trusted default header for the missing-Origin case.
    if origin is None:
        clients[0].headers.pop("origin")

    # Act
    response = await clients[0].post(
        "/api/v1/computes",
        json={
            "name": "attacker-compute",
            "gateway_url": "https://gateway.example",
            "database_storage_class": "local-path",
            "storage_endpoint": "https://storage.example",
            "kubeconfig": {
                "clusters": [{"name": "cluster", "cluster": {}}],
                "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
                "current-context": "context",
                "users": [{"name": "user", "user": {}}],
            },
        },
        headers={} if origin is None else {"origin": origin},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        assert await session.scalar(select(ComputeRegistry)) is None
    assert await fetch_operations() == []


@pytest.mark.parametrize("origin", [None, "", "https://attacker.example"])
async def test_authenticated_compute_deletion_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    origin: str | None,
) -> None:
    """Reject cookie-authenticated Compute deletion before the registry can change."""

    # Arrange
    compute = await create_compute()

    # Remove the client's trusted default header for the missing-Origin case.
    if origin is None:
        clients[0].headers.pop("origin")

    # Act
    response = await clients[0].delete(
        f"/api/v1/computes/{compute.id}",
        headers={} if origin is None else {"origin": origin},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        assert await session.get(ComputeRegistry, compute.id) is not None
