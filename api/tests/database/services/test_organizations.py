import pytest
from uuid import uuid4
from conftest import DatabasePostgres
from sqlmodel import col
from factories import create_solution, fetch_operations, create_organization, create_ready_compute
from sqlalchemy import update
from src.errors import ConflictError, NotFoundError, ForbiddenError, UnavailableError
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.models.solutions import SolutionCreate
from src.database.services import solutions, invitations, organizations
from src.models.pagination import Pagination
from longlink.shared.models import Audit
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def test_create_persists_org_and_owner_membership(users: tuple[User, User, User]) -> None:
    """Persist a new org and link the creator as owner."""

    # Arrange
    owner = users[0]
    compute = await create_ready_compute()

    # Act
    organization = await create_organization(owner, compute=compute)

    # Assert
    assert organization.compute_id == compute.id
    assert organization.database_idle_seconds == 0
    assert organization.database_sync_pending is True
    assert organization.status == Status.creating

    async with session_scope() as session:
        reloaded = await session.get(Organization, organization.id)
        assert reloaded is not None
        assert reloaded.deleted_at is None
        memberships = await organizations.members(session, organization.id)
    assert reloaded.name == "acme"
    assert reloaded.slug == "acme"
    assert [(membership.user.id, membership.role) for membership in memberships] == [(owner.id, OrganizationRoles.owner)]


async def test_members_returns_users_from_membership_table(users: tuple[User, User, User]) -> None:
    """Return org members loaded through the organization relationship."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)

    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        memberships = await organizations.members(session, organization.id)

    # Assert
    assert {membership.user.id for membership in memberships} == {owner.id, member.id}


async def test_membership_returns_active_membership_with_organization(users: tuple[User, User, User]) -> None:
    """Return an active member's organization-scoped access record."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    async with session_scope() as session:
        membership = await organizations.membership(session, users[0].id, organization.id)

    # Assert
    assert membership is not None
    assert membership.organization.id == organization.id
    assert membership.role == OrganizationRoles.owner


async def test_solution_runtime_access_returns_member_and_compute_assignment(users: tuple[User, User, User]) -> None:
    """Return active runtime access with the assigned compute registry."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)

    # Act
    async with session_scope() as session:
        access = await organizations.solution_runtime_access(session, users[0].id, solution.id)

    # Assert
    assert access is not None
    resolved_solution, role, compute = access
    assert resolved_solution.id == solution.id
    assert resolved_solution.organization_id == organization.id
    assert role == OrganizationRoles.owner
    assert compute.id == organization.compute_id


async def test_infrastructure_returns_all_organization_registry_assignments(users: tuple[User, User, User]) -> None:
    """Return one Organization together with each assigned registry."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    async with session_scope() as session:
        resolved = await organizations.infrastructure(session, organization.id)

    # Assert
    assert resolved is not None
    assert resolved.organization.id == organization.id
    assert resolved.compute.id == organization.compute_id


async def test_solution_infrastructure_returns_solution_registry_assignments(users: tuple[User, User, User]) -> None:
    """Return a Solution together with its Organization infrastructure."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)

    # Act
    async with session_scope() as session:
        resolved = await organizations.solution_infrastructure(session, solution.id)

    # Assert
    assert resolved is not None
    resolved_solution, infrastructure = resolved
    assert resolved_solution.id == solution.id
    assert infrastructure.organization.id == organization.id
    assert infrastructure.compute.id == organization.compute_id


async def test_fetch_ignores_deleted_organizations(users: tuple[User, User, User]) -> None:
    """Return only active organizations from the collection service."""

    # Arrange
    owner = users[0]
    active_organization = await create_organization(owner)
    deleted_organization = await create_organization(owner, name="deleted")
    async with session_scope() as session:
        await organizations.soft_delete(session, deleted_organization.id, owner)
        await session.commit()

        # Act
        fetched, total = await organizations.fetch_page(session, Pagination())

    # Assert
    assert [organization.id for organization in fetched] == [active_organization.id]
    assert total == 1


@pytest.mark.parametrize("deleted", [False, True])
async def test_sync_users_skips_creating_and_deleted_organizations(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    deleted: bool,
) -> None:
    """Avoid connecting to Organization databases before activation or after deletion."""

    # Arrange
    organization = await create_organization(users[0])
    synchronized: list[tuple[DatabasePostgres, object]] = []

    async def capture_sync(conn: DatabasePostgres, rows: object) -> None:
        """Record unexpected shared-database synchronization attempts."""

        synchronized.append((conn, rows))

    monkeypatch.setattr(organizations.shared_audit, "sync", capture_sync)

    # Act
    async with session_scope() as session:
        if deleted:
            await organizations.soft_delete(session, organization.id, users[0])
            await session.commit()
        await organizations.sync_users(session, organization.id)

    # Assert
    assert synchronized == []


async def test_sync_users_projects_active_organization_members(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Publish the Platform-authoritative member snapshot for a running Organization."""

    # Arrange
    organization = await create_organization(users[0])
    synchronized: list[tuple[DatabasePostgres, list[Audit]]] = []

    async def capture_sync(conn: DatabasePostgres, rows: list[Audit]) -> None:
        """Capture the shared-database projection without opening a connection."""

        synchronized.append((conn, rows))

    monkeypatch.setattr(organizations.shared_audit, "sync", capture_sync)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.status = Status.running
        await session.commit()

    # Act
    async with session_scope() as session:
        await organizations.project_users(session, organization.id, DatabasePostgres())

    # Assert
    conn, rows = synchronized[0]
    assert conn.database == organization.id.hex
    assert conn.search_path == "shared"
    (row,) = rows
    assert row.id == users[0].id
    assert row.name == users[0].name
    assert row.email == users[0].email
    assert row.role == OrganizationRoles.owner.value
    assert row.deleted_at is None


async def test_update_member_role_rejects_missing_member(users: tuple[User, User, User]) -> None:
    """Reject role changes for absent organization members."""

    # Arrange
    owner, _, non_member = users
    organization = await create_organization(owner)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(NotFoundError):
            await organizations.update_member_role(session, organization.id, non_member.id, OrganizationRoles.read, owner.id)


async def test_update_member_role_rejects_owner_changes_from_non_owners(users: tuple[User, User, User]) -> None:
    """Require owner access to change an owner's Organization role."""

    # Arrange
    owner, administrator = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=administrator.id, organization_id=organization.id, role=OrganizationRoles.admin))
        await session.commit()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ForbiddenError, match="Owner management permissions required"):
            await organizations.update_member_role(
                session,
                organization.id,
                owner.id,
                OrganizationRoles.read,
                administrator.id,
            )


async def test_update_member_role_rejects_demoting_the_last_owner(users: tuple[User, User, User]) -> None:
    """Preserve at least one active owner for every Organization."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="Organization must have at least one owner"):
            await organizations.update_member_role(
                session,
                organization.id,
                owner.id,
                OrganizationRoles.maintain,
                owner.id,
            )


async def test_update_member_role_skips_unchanged_assignments(users: tuple[User, User, User]) -> None:
    """Avoid mutations when a member already has the requested role."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    async with session_scope() as session:
        await organizations.update_member_role(
            session,
            organization.id,
            owner.id,
            OrganizationRoles.owner,
            owner.id,
        )


async def test_update_member_role_persists_owner_authorized_change(users: tuple[User, User, User]) -> None:
    """Allow owners to update an active member role."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.read))
        await session.commit()

    # Act
    async with session_scope() as session:
        await organizations.update_member_role(
            session,
            organization.id,
            member.id,
            OrganizationRoles.maintain,
            owner.id,
        )
        await session.commit()

    # Assert
    async with session_scope() as session:
        membership = await session.get(UserOrganization, (member.id, organization.id))
    assert membership is not None
    assert membership.role == OrganizationRoles.maintain


async def test_update_member_role_allows_demoting_an_owner_when_another_owner_remains(
    users: tuple[User, User, User],
) -> None:
    """Allow an owner demotion while preserving a separate active owner."""

    # Arrange
    owner, second_owner = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=second_owner.id, organization_id=organization.id, role=OrganizationRoles.owner))
        await session.commit()

    # Act
    async with session_scope() as session:
        await organizations.update_member_role(
            session,
            organization.id,
            second_owner.id,
            OrganizationRoles.maintain,
            owner.id,
        )
        await session.commit()

    # Assert
    async with session_scope() as session:
        membership = await session.get(UserOrganization, (second_owner.id, organization.id))
    assert membership is not None
    assert membership.role == OrganizationRoles.maintain


async def test_mutation_services_revalidate_demoted_administrator_access(users: tuple[User, User, User]) -> None:
    """Reject stale administrator requests while retaining the owner's current mutation access."""

    # Arrange an owner and a current administrator with access to every affected mutation.
    owner, administrator = users[1], users[2]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=administrator.id, organization_id=organization.id, role=OrganizationRoles.admin))
        await session.commit()

    # Preserve legitimate owner mutations before revoking the administrator.
    async with session_scope() as session:
        updated = await organizations.update(session, organization.id, "https://example.com/owner.png", owner.id)
        await organizations.create_invitation(
            session,
            organization.id,
            "owner-invited@example.com",
            OrganizationRoles.read,
            owner.id,
        )
        await session.commit()

    assert updated is not None
    async with session_scope() as session:
        invitation_id = (await organizations.invitations(session, organization.id))[0].id

    # Cache authorization in independent request sessions before concurrently demoting the administrator.
    async with (
        session_scope() as update_session,
        session_scope() as create_invitation_session,
        session_scope() as revoke_invitation_session,
        session_scope() as role_session,
    ):
        for request_session in (update_session, create_invitation_session, revoke_invitation_session, role_session):
            cached_membership = await organizations.membership(request_session, administrator.id, organization.id)
            assert cached_membership is not None

        async with session_scope() as concurrent_session:
            membership = await concurrent_session.get(UserOrganization, (administrator.id, organization.id))
            assert membership is not None
            membership.role = OrganizationRoles.read
            await concurrent_session.commit()

        # Act and assert every service refreshes the persisted membership under its Organization lock.
        with pytest.raises(ForbiddenError, match="Permission required"):
            await organizations.update(update_session, organization.id, "https://example.com/blocked.png", administrator.id)
        with pytest.raises(ForbiddenError, match="Permission required"):
            await organizations.create_invitation(
                create_invitation_session,
                organization.id,
                "blocked-invited@example.com",
                OrganizationRoles.read,
                administrator.id,
            )
        with pytest.raises(ForbiddenError, match="Permission required"):
            await organizations.revoke_invitation(revoke_invitation_session, organization.id, invitation_id, administrator.id)
        with pytest.raises(ForbiddenError, match="Permission required"):
            await organizations.update_member_role(
                role_session,
                organization.id,
                owner.id,
                OrganizationRoles.admin,
                administrator.id,
            )


async def test_soft_delete_revalidates_demoted_owner_access(users: tuple[User, User, User]) -> None:
    """Reject an organization deletion after the initiating owner has been demoted."""

    # Arrange another owner so the initiating owner can be demoted through the supported role workflow.
    owner, second_owner = users[1], users[2]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=second_owner.id, organization_id=organization.id, role=OrganizationRoles.owner))
        await session.commit()
    async with session_scope() as session:
        await organizations.update_member_role(session, organization.id, owner.id, OrganizationRoles.read, second_owner.id)
        await session.commit()

    # Act and assert the demoted owner cannot tombstone the Organization.
    async with session_scope() as session:
        with pytest.raises(ForbiddenError, match="Permission required"):
            await organizations.soft_delete(session, organization.id, owner)

    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
    assert persisted is not None
    assert persisted.deleted_at is None


async def test_create_allows_creating_compute(users: tuple[User, User, User]) -> None:
    """Create Organizations queued behind their creating compute target."""

    # Arrange
    owner = users[0]
    compute = await create_ready_compute()
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, compute.id)
        assert registry is not None
        registry.status = Status.creating
        await session.commit()

    # Act
    organization = await create_organization(owner, compute=compute)

    # Assert
    async with session_scope() as session:
        fetched, total = await organizations.fetch_page(session, Pagination())
        assert fetched == [organization]
        assert total == 1
        reloaded_compute = await session.get(ComputeRegistry, compute.id)
        assert reloaded_compute is not None
        assert reloaded_compute.status == Status.creating
        assert len(await fetch_operations()) == 1


async def test_create_default_selects_least_assigned_ready_infrastructure(users: tuple[User, User, User]) -> None:
    """Assign the least-used ready registry of each infrastructure type."""

    # Arrange
    owner = users[0]
    assigned_compute = await create_ready_compute()
    available_compute = await create_ready_compute()
    await create_organization(owner, compute=assigned_compute)

    # Act
    async with session_scope() as session:
        organization = await organizations.create_default(session, "balanced", owner)
        await session.commit()

    # Assert
    assert organization.compute_id == available_compute.id


async def test_create_rejects_missing_assigned_infrastructure(users: tuple[User, User, User]) -> None:
    """Reject direct Organization creation when the assigned Compute registry is absent."""

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(UnavailableError, match="No compute registry available"):
            await organizations.create(session, "acme", users[0], compute_id=uuid4())


async def test_create_rejects_duplicate_organization_name(users: tuple[User, User, User]) -> None:
    """Reject duplicate Organization names without persisting a second membership."""

    # Arrange
    compute = await create_ready_compute()
    await create_organization(users[0], compute=compute)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match="Organization already exists"):
            await organizations.create(
                session,
                "acme",
                users[0],
                compute_id=compute.id,
            )


async def test_update_returns_none_for_missing_organization(users: tuple[User, User, User]) -> None:
    """Treat updates to missing Organizations as absent resources."""

    # Act
    async with session_scope() as session:
        updated = await organizations.update(session, uuid4(), "https://example.com/avatar.png", users[0].id)

    # Assert
    assert updated is None


async def test_update_keeps_organization_unchanged_when_avatar_matches(users: tuple[User, User, User]) -> None:
    """Return the locked Organization for an identical avatar."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    async with session_scope() as session:
        updated = await organizations.update(session, organization.id, organization.avatar, users[0].id)

    # Assert
    assert updated is not None
    assert updated.avatar == organization.avatar


async def test_soft_delete_tombstones_solutions_and_retains_memberships(users: tuple[User, User, User]) -> None:
    """Tombstone solutions while retaining Organization memberships until purge."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await session.execute(update(Organization).where(col(Organization.id) == organization.id).values(status=Status.running))
        solution = await solutions.create(
            session,
            organization.id,
            SolutionCreate(name="Dashboard", image=Image("ghcr.io/longlink/dashboard@sha256:test")),
            LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test")),
            user_id=owner.id,
        )
        await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.write)
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        result = await organizations.soft_delete(session, organization.id, owner)
        await session.commit()
        deleted_organization = await session.get(Organization, organization.id)
        deleted_solution = await session.get(Solution, solution.id)
        second_delete = await organizations.soft_delete(session, organization.id, owner)
        missing_delete = await organizations.soft_delete(session, uuid4(), owner)
        await session.commit()

    # Assert
    assert result is not None
    assert result.deleted_id == owner.id
    assert deleted_organization is not None
    assert deleted_organization.deleted_id == owner.id
    async with session_scope() as session:
        members = await organizations.members(session, organization.id)
        assert await organizations.invitations(session, organization.id) == []
        assert await organizations.solutions(session, organization.id) == []
        assert all(operation.target_id != solution.id for operation in await fetch_operations())
    assert {member.user_id for member in members} == {owner.id, member.id}
    assert deleted_solution is not None
    assert deleted_solution.deleted_at is not None
    assert second_delete is not None
    assert second_delete.id == result.id
    assert missing_delete is None
