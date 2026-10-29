import pytest
from uuid import uuid4
from fastapi import HTTPException
from factories import add_member, create_compute, fetch_operations, create_organization, assert_no_new_operations
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.database.session import session_scope
from src.models.solutions import SolutionCreate
from src.database.services import solutions, organizations
from src.models.pagination import Pagination
from src.models.organizations import OrganizationInvitationCreate
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


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
        fetched, total = await organizations.fetch(session, Pagination())

    # Assert
    assert [organization.id for organization in fetched] == [active_organization.id]
    assert total == 1


async def test_update_member_role_rejects_owner_changes_from_non_owners(users: tuple[User, User, User]) -> None:
    """Require owner access to change an owner's Organization role."""

    # Arrange
    owner, administrator = users[0], users[1]
    organization = await create_organization(owner)
    await add_member(user=administrator, organization=organization, role=OrganizationRoles.admin)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(HTTPException, match="403: Owner management permissions required"):
            await organizations.update_member_role(session, organization.id, owner.id, OrganizationRoles.read, administrator.id)


async def test_membership_mutation_services_revalidate_demoted_administrator_access(users: tuple[User, User, User]) -> None:
    """Reject stale administrator requests while retaining the owner's current invitation access."""

    # Arrange an owner and a current administrator with access to every remaining membership mutation.
    owner, administrator = users[1], users[2]
    organization = await create_organization(owner)
    await add_member(user=administrator, organization=organization, role=OrganizationRoles.admin)

    # Preserve legitimate owner invitation access before revoking the administrator.
    async with session_scope() as session:
        await organizations.create_invitation(
            session, organization.id, OrganizationInvitationCreate(email="owner-invited@example.com", role=OrganizationRoles.read), owner.id
        )
        await session.commit()

    async with session_scope() as session:
        invitation_id = (await organizations.invitations(session, organization.id))[0].id

    # Cache authorization in independent request sessions before concurrently demoting the administrator.
    async with session_scope() as create_invitation_session, session_scope() as revoke_invitation_session, session_scope() as role_session:
        for request_session in (create_invitation_session, revoke_invitation_session, role_session):
            cached_membership = await organizations.require_membership(request_session, administrator.id, organization.id)
            assert cached_membership is not None

        async with session_scope() as concurrent_session:
            # Revoke privileges through another transaction before the command resumes.
            membership = await concurrent_session.get(UserOrganization, (administrator.id, organization.id))
            assert membership is not None
            membership.role = OrganizationRoles.read
            await concurrent_session.commit()

        # Act and assert every service refreshes the persisted membership under its Organization lock.
        with pytest.raises(HTTPException, match="403: Permission required"):
            await organizations.create_invitation(
                create_invitation_session,
                organization.id,
                OrganizationInvitationCreate(email="blocked-invited@example.com", role=OrganizationRoles.read),
                administrator.id,
            )

        # Cached membership must not authorize a command after demotion.
        with pytest.raises(HTTPException, match="403: Permission required"):
            await organizations.revoke_invitation(revoke_invitation_session, organization.id, invitation_id, administrator.id)
        with pytest.raises(HTTPException, match="403: Permission required"):
            await organizations.update_member_role(role_session, organization.id, owner.id, OrganizationRoles.admin, administrator.id)

    # Verify none of the rejected mutations persisted in an independent session.
    async with session_scope() as session:
        remaining_invitations = await organizations.invitations(session, organization.id)
        owner_membership = await session.get(UserOrganization, (owner.id, organization.id))
        administrator_membership = await session.get(UserOrganization, (administrator.id, organization.id))

    assert [invitation.id for invitation in remaining_invitations] == [invitation_id]
    assert owner_membership is not None
    assert owner_membership.role == OrganizationRoles.owner
    assert administrator_membership is not None
    assert administrator_membership.role == OrganizationRoles.read


async def test_soft_delete_revalidates_demoted_owner_access(users: tuple[User, User, User]) -> None:
    """Reject an organization deletion after the initiating owner has been demoted."""

    # Arrange another owner so the initiating owner can be demoted through the supported role workflow.
    owner, second_owner = users[1], users[2]
    organization = await create_organization(owner)
    await add_member(user=second_owner, organization=organization, role=OrganizationRoles.owner)
    async with session_scope() as session:
        await organizations.update_member_role(session, organization.id, owner.id, OrganizationRoles.read, second_owner.id)
        await session.commit()

    # Act and assert the demoted owner cannot tombstone the Organization.
    async with session_scope() as session:
        with pytest.raises(HTTPException, match="403: Permission required"):
            await organizations.soft_delete(session, organization.id, owner)

    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
    assert persisted is not None

    # Rejected deletion must leave the Organization active.
    assert persisted.deleted_at is None


async def test_create_selects_least_assigned_infrastructure(users: tuple[User, User, User]) -> None:
    """Assign the least-used Compute registry."""

    # Arrange
    owner = users[0]
    assigned_compute = await create_compute()
    available_compute = await create_compute()
    await create_organization(owner, compute=assigned_compute)

    # Act
    async with session_scope() as session:
        organization = await organizations.create(session, "balanced", owner)
        await session.commit()

    # Assert
    assert organization.compute_id == available_compute.id


async def test_create_rejects_duplicate_organization_name(users: tuple[User, User, User]) -> None:
    """Reject duplicate Organization names without persisting a second membership."""

    # Arrange
    organization = await create_organization(users[0])
    previous_operations = await fetch_operations()

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(HTTPException, match="409: Organization already exists"):
            await organizations.create(session, "acme", users[0])
        await session.commit()

    # The savepoint retains the original Organization and owner without queueing duplicate work.
    async with session_scope() as session:
        fetched, total = await organizations.fetch(session, Pagination())
        memberships = await organizations.members(session, organization.id)
    assert [item.id for item in fetched] == [organization.id]
    assert total == 1
    assert [(membership.user_id, membership.role) for membership in memberships] == [(users[0].id, OrganizationRoles.owner)]
    await assert_no_new_operations(previous_operations)


async def test_soft_delete_tombstones_solutions_and_retains_memberships(users: tuple[User, User, User]) -> None:
    """Tombstone solutions while retaining Organization memberships until purge."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    payload = SolutionCreate(name="Dashboard", image=Image("ghcr.io/longlink/dashboard:latest"))
    metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test"))
    async with session_scope() as session:
        solution = await solutions.create(
            session,
            organization.id,
            metadata,
            payload=payload,
            # Attribute the child Solution to the Organization owner.
            user_id=owner.id,
        )
        session.add(OrganizationInvitation(organization_id=organization.id, email="invited@example.com", role=OrganizationRoles.write))
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.write))
        await session.commit()

    # Act
    async with session_scope() as session:
        result = await organizations.soft_delete(session, organization.id, owner)
        await session.commit()
        deleted_organization = await session.get(Organization, organization.id)
        deleted_solution = await session.get(Solution, solution.id)
        second_delete = await organizations.soft_delete(session, organization.id, owner)

        # A genuinely missing Organization remains distinguishable from a repeated deletion.
        with pytest.raises(HTTPException) as missing_delete:
            await organizations.soft_delete(session, uuid4(), owner)
        await session.commit()

    # Assert
    assert result is not None
    assert deleted_organization is not None
    async with session_scope() as session:
        members = await organizations.members(session, organization.id)
        assert await organizations.invitations(session, organization.id) == []
        assert await organizations.solutions(session, organization.id) == []
        assert all(operation.target_id != solution.id for operation in await fetch_operations())
    assert {member.user_id for member in members} == {owner.id, member.id}
    assert deleted_solution is not None

    # Parent deletion also tombstones the owned Solution exactly once.
    assert deleted_solution.deleted_at is not None
    assert second_delete is not None
    assert second_delete.id == result.id
    assert missing_delete.value.status_code == 404
    assert missing_delete.value.detail == "Organization not found"
