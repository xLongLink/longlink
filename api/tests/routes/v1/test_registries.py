import pytest
from uuid import UUID
from httpx2 import AsyncClient
from pydantic import SecretStr
from factories import (
    add_member,
    claim_operation,
    create_solution,
    queue_operation,
    fetch_operations,
    create_organization,
    assert_no_new_operations,
)
from src.utils import github
from sqlalchemy import select
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.registries import RegistryConnection
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def test_registry_creation_rejects_maintainer_demoted_during_github_lookup(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Recheck maintenance permission after GitHub lookup without persisting credentials or work."""

    # Arrange
    organization = await create_organization(users[0])
    maintainer = users[1]
    assert not maintainer.administrator
    await add_member(user=maintainer, organization=organization, role=OrganizationRoles.maintain)
    previous_operations = await fetch_operations()
    credential = "ghp-maintainer-token"

    async def demote_during_lookup(token: SecretStr) -> str:
        """Commit permission revocation while the request awaits its external account lookup."""

        # Demote the otherwise valid maintainer through an independent database session.
        assert token.get_secret_value() == credential
        async with session_scope() as session:
            membership = await session.get(UserOrganization, (maintainer.id, organization.id))
            assert membership is not None
            assert membership.role == OrganizationRoles.maintain
            membership.role = OrganizationRoles.read
            await session.commit()
        return "registry-maintainer"

    monkeypatch.setattr(github, "username", demote_during_lookup)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/registries", json={"provider": "ghcr", "credential": credential}
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    async with session_scope() as session:
        persisted_organization = await session.get(Organization, organization.id)
        assert persisted_organization is not None
        assert persisted_organization.deleted_at is None
        persisted_user = await session.get(User, maintainer.id)
        assert persisted_user is not None
        assert not persisted_user.administrator

        # Verify registry access comes from tenant membership, not Platform administration.
        membership = await session.get(UserOrganization, (maintainer.id, organization.id))
        assert membership is not None
        assert membership.role == OrganizationRoles.read
        assert await session.scalar(select(RegistryConnection)) is None
    await assert_no_new_operations(previous_operations)


async def test_registry_list_is_tenant_scoped_and_redacts_credentials(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Return only the selected Organization's connection identities to a read member."""

    # Arrange
    organization = await create_organization(users[0])
    foreign_organization = await create_organization(users[2], name="foreign")
    await add_member(user=users[1], organization=organization, role=OrganizationRoles.read)
    connection = RegistryConnection(
        organization_id=organization.id, username="selected-account", credential="selected-credential-must-not-leak"
    )
    foreign_connection = RegistryConnection(
        organization_id=foreign_organization.id, username="foreign-account", credential="foreign-credential-must-not-leak"
    )

    # Persist both tenant-owned and foreign credentials before the lookup.
    async with session_scope() as session:
        session.add_all([connection, foreign_connection])
        await session.commit()

    # Act
    response = await clients[1].get(f"/api/v1/organizations/{organization.id}/registries")
    foreign_response = await clients[2].get(f"/api/v1/organizations/{foreign_organization.id}/registries")

    # Assert
    assert response.status_code == 200
    assert response.json() == [{"id": str(connection.id), "host": "ghcr.io", "provider": "ghcr", "username": "selected-account"}]
    assert foreign_response.status_code == 200
    assert foreign_response.json() == [
        {"id": str(foreign_connection.id), "host": "ghcr.io", "provider": "ghcr", "username": "foreign-account"}
    ]


async def test_registry_delete_preserves_credentials_used_by_historical_revision(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Keep credentials needed by retained releases even when current pointers do not use them."""

    # Arrange
    organization = await create_organization(users[1])
    solution = await create_solution(organization)
    connection = RegistryConnection(organization_id=organization.id, username="historical", credential="retained-token")
    historical = Revision(
        solution_id=solution.id, image="ghcr.io/acme/private@sha256:historical", registry_connection_id=connection.id, envs={}
    )
    async with session_scope() as session:
        session.add(connection)
        await session.flush()

        # Historical releases keep their own credential reference.
        session.add(historical)
        await session.commit()
    previous_operations = await fetch_operations()

    # Act
    response = await clients[1].delete(f"/api/v1/organizations/{organization.id}/registries/{connection.id}")

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Registry connection is used by retained Solution revisions"}
    async with session_scope() as session:
        persisted_connection = await session.get(RegistryConnection, connection.id)
        assert persisted_connection is not None
        assert persisted_connection.credential == "retained-token"
        persisted_revision = await session.get(Revision, historical.id)
        assert persisted_revision is not None
        assert persisted_revision.registry_connection_id == connection.id

        # Credential changes must preserve the Solution's current release ownership.
        persisted_solution = await session.get(Solution, solution.id)
        assert persisted_solution is not None
        assert historical.id not in (persisted_solution.desired_revision_id, persisted_solution.deployed_revision_id)
    await assert_no_new_operations(previous_operations)


async def test_registry_create_commits_credentials_and_fresh_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Persist a maintainer's credentials and new demand rather than reuse unfinished work."""

    # Arrange
    organization = await create_organization(users[0])
    await add_member(user=users[1], organization=organization, role=OrganizationRoles.maintain)
    await queue_operation(target_id=organization.id)
    await claim_operation()
    previous_operations = await fetch_operations()
    assert len(previous_operations) == 1
    assert previous_operations[0].finished_at is None
    assert previous_operations[0].lease_expires_at is not None
    credential = "ghp-create-token-must-not-leak"

    async def username(token: SecretStr) -> str:
        """Resolve the submitted credential without contacting GitHub."""

        assert token.get_secret_value() == credential
        return "registry-maintainer"

    monkeypatch.setattr(github, "username", username)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/registries", json={"provider": "ghcr", "credential": credential}
    )

    # Assert
    assert response.status_code == 201
    connection_id = UUID(response.json()["id"])
    assert response.json() == {"id": str(connection_id), "host": "ghcr.io", "provider": "ghcr", "username": "registry-maintainer"}
    async with session_scope() as session:
        connection = await session.get(RegistryConnection, connection_id)
        assert connection is not None
        assert connection.organization_id == organization.id
        assert connection.username == "registry-maintainer"
        assert connection.credential == credential

    # Registry updates schedule reconciliation through the real operation queue.
    current_operations = await fetch_operations()
    assert len(current_operations) == 2
    assert previous_operations[0].id in {operation.id for operation in current_operations}
    new_operations = [operation for operation in current_operations if operation.id != previous_operations[0].id]
    assert len(new_operations) == 1
    assert new_operations[0].kind == OperationKind.organization_create
    assert new_operations[0].target_id == organization.id
    assert new_operations[0].finished_at is None


async def test_registry_delete_commits_removal_and_fresh_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Commit unused credential removal with new demand despite unfinished reconciliation."""

    # Arrange
    organization = await create_organization(users[1])
    connection = RegistryConnection(organization_id=organization.id, username="unused", credential="delete-token")
    async with session_scope() as session:
        session.add(connection)
        await session.commit()
    await queue_operation(target_id=organization.id)
    await claim_operation()
    previous_operations = await fetch_operations()
    assert len(previous_operations) == 1

    # Existing leased work remains active when reconciliation is requested again.
    assert previous_operations[0].finished_at is None
    assert previous_operations[0].lease_expires_at is not None

    # Act
    response = await clients[1].delete(f"/api/v1/organizations/{organization.id}/registries/{connection.id}")

    # Assert
    assert response.status_code == 204
    assert response.content == b""
    async with session_scope() as session:
        assert await session.get(RegistryConnection, connection.id) is None
    current_operations = await fetch_operations()
    assert len(current_operations) == 2
    assert previous_operations[0].id in {operation.id for operation in current_operations}
    new_operations = [operation for operation in current_operations if operation.id != previous_operations[0].id]
    assert len(new_operations) == 1

    # Reconciliation targets the owning Organization rather than an individual release.
    assert new_operations[0].kind == OperationKind.organization_create
    assert new_operations[0].target_id == organization.id
    assert new_operations[0].finished_at is None
