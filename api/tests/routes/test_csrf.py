import pytest
from httpx2 import AsyncClient
from conftest import UNTRUSTED_ORIGINS, assert_origin_rejected, untrusted_origin_headers
from sqlmodel import select
from factories import create_compute, create_solution, fetch_operations, create_organization, assert_no_new_operations
from sqlalchemy import func
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def test_authenticated_solution_update_rejects_untrusted_origin_before_inspection(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject cross-origin updates before registry inspection or revision persistence."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    previous_operations = await fetch_operations()

    async def unexpected_metadata(*_args: object) -> object:
        """Fail if a rejected browser request reaches registry inspection."""

        raise AssertionError("untrusted solution update must not inspect image metadata")

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", unexpected_metadata)

    # Act
    response = await clients[0].post(
        f"/api/v1/solutions/{solution.id}/update",
        json={},
        headers={"origin": "https://attacker.example"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
    assert persisted is not None
    assert persisted.desired_revision_id == solution.desired_revision_id
    await assert_no_new_operations(previous_operations)


async def test_authenticated_solution_deletion_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject cross-origin solution deletion before tombstoning or queueing cleanup."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    previous_operations = await fetch_operations()

    # Act
    response = await clients[0].delete(
        f"/api/v1/solutions/{solution.id}",
        headers={"origin": "https://attacker.example"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
    assert persisted is not None
    assert persisted.deleted_at is None
    await assert_no_new_operations(previous_operations)


async def test_authenticated_organization_deletion_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject cross-origin organization deletion before tombstoning or queueing cleanup."""

    # Arrange
    organization = await create_organization(users[0])
    previous_operations = await fetch_operations()

    # Act
    response = await clients[0].delete(
        f"/api/v1/organizations/{organization.id}",
        headers={"origin": "https://attacker.example"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
    assert persisted is not None
    assert persisted.deleted_at is None
    await assert_no_new_operations(previous_operations)


async def test_authenticated_invitation_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    captured_mail: list[tuple[str, str, str, str | None]],
) -> None:
    """Reject cross-origin invitations before persistence or mail delivery."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/invitations",
        json={"email": users[1].email, "role": "write"},
        headers={"origin": "https://attacker.example"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        assert await session.scalar(select(OrganizationInvitation)) is None
    assert captured_mail == []


async def test_authenticated_member_role_update_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject cross-origin role changes before modifying organization membership."""

    # Arrange
    organization = await create_organization(users[0])
    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=users[1].id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()
        original = await session.get(UserOrganization, (users[1].id, organization.id))
        assert original is not None
        original_updated_at = original.updated_at

    # Act
    response = await clients[0].patch(
        f"/api/v1/organizations/{organization.id}/members/{users[1].id}",
        json={"role": "admin"},
        headers={"origin": "https://attacker.example"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        unchanged = await session.get(UserOrganization, (users[1].id, organization.id))
    assert unchanged is not None
    assert unchanged.role == OrganizationRoles.write
    assert unchanged.updated_at == original_updated_at


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
async def test_authenticated_organization_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    origin: str | None,
) -> None:
    """Reject unsafe cookie-authenticated writes before the route can persist data."""

    # Arrange
    await create_compute()
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].post(
        "/api/v1/organizations",
        json={"name": "acme"},
        headers=headers,
    )

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        result = await session.execute(select(Organization))
        organizations = result.scalars().all()
    assert organizations == []


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
async def test_authenticated_profile_update_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    origin: str | None,
) -> None:
    """Reject cookie-authenticated profile writes before the route can persist data."""

    # Arrange
    current = await clients[0].get("/api/v1/me")
    original_name = current.json()["name"]
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].patch(
        "/api/v1/me",
        json={"name": "attacker-name"},
        headers=headers,
    )

    # Assert
    assert_origin_rejected(response)
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
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
        headers=headers,
    )

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        count = await session.scalar(select(func.count()).select_from(Solution).where(Solution.organization_id == organization.id))
    assert count == 0


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
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
    headers = untrusted_origin_headers(clients[0], origin)

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
        headers=headers,
    )

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        assert await session.scalar(select(ComputeRegistry)) is None
    assert await fetch_operations() == []


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
async def test_authenticated_compute_deletion_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    origin: str | None,
) -> None:
    """Reject cookie-authenticated Compute deletion before the registry can change."""

    # Arrange
    compute = await create_compute()
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].delete(
        f"/api/v1/computes/{compute.id}",
        headers=headers,
    )

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        assert await session.get(ComputeRegistry, compute.id) is not None
