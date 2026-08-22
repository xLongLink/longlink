import pytest
from uuid import uuid4
from sqlmodel import col
from factories import create_organization, create_ready_infrastructure
from sqlalchemy import update
from src.errors import ConflictError, NotFoundError, UnavailableError
from src.models.roles import OrganizationRoles
from src.models.types import Image
from longlink.utils.time import utcnow
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations, invitations, applications, organizations
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.association import UserOrganization
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def test_create_persists_org_and_owner_membership(users: tuple[User, User, User]) -> None:
    """Persist a new org and link the creator as owner."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()

    # Act
    organization = await create_organization(owner, infrastructure=infrastructure)

    # Assert
    assert organization.compute_id == infrastructure.compute.id
    assert organization.database_id == infrastructure.database.id
    assert organization.storage_id == infrastructure.storage.id
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


async def test_fetch_ignores_deleted_organizations(users: tuple[User, User, User]) -> None:
    """Return only active organizations from the collection service."""

    # Arrange
    owner = users[0]
    active_organization = await create_organization(owner)
    deleted_organization = await create_organization(owner, name="deleted", slug="deleted")
    async with session_scope() as session:
        await organizations.soft_delete(session, deleted_organization.id, owner)
        await session.commit()

        # Act
        fetched = await organizations.fetch(session)

    # Assert
    assert [organization.id for organization in fetched] == [active_organization.id]


async def test_update_member_role_updates_existing_memberships(users: tuple[User, User, User]) -> None:
    """Update an active organization member role."""

    # Arrange
    owner, member = users[:2]
    organization = await create_organization(owner)

    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        updated = await organizations.update_member_role(
            session, organization.id, member.id, OrganizationRoles.maintain, owner, OrganizationRoles.owner
        )
        await session.commit()
        memberships = await organizations.members(session, organization.id)
        updated_membership = next(item for item in memberships if item.user_id == member.id)

    # Assert
    assert updated is True
    assert updated_membership.role == OrganizationRoles.maintain


async def test_update_member_role_rejects_missing_member(users: tuple[User, User, User]) -> None:
    """Reject role changes for absent organization members."""

    # Arrange
    owner, _, non_member = users
    organization = await create_organization(owner)

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(NotFoundError):
            await organizations.update_member_role(
                session, organization.id, non_member.id, OrganizationRoles.read, owner, OrganizationRoles.owner
            )


async def test_update_member_role_rejects_demoting_last_owner(users: tuple[User, User, User]) -> None:
    """Keep at least one owner in every organization."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    async with session_scope() as session:
        with pytest.raises(ConflictError) as exc:
            await organizations.update_member_role(
                session, organization.id, owner.id, OrganizationRoles.admin, owner, OrganizationRoles.owner
            )

    # Assert
    assert str(exc.value) == "Organization must have at least one owner"
    async with session_scope() as session:
        membership = next(item for item in await organizations.members(session, organization.id) if item.user_id == owner.id)
    assert membership.role == OrganizationRoles.owner


async def test_all_members_returns_deleted_memberships(users: tuple[User, User, User]) -> None:
    """Return every organization membership for lifecycle synchronization."""

    # Arrange
    owner, member, deleted_member = users
    deleted_at = utcnow()
    organization = await create_organization(owner)

    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        session.add(
            UserOrganization(
                user_id=deleted_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
                deleted_at=deleted_at,
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        members = await organizations.all_members(session, organization.id)

    # Assert
    memberships = {membership.user.email: membership for membership in members}
    assert set(memberships) == {owner.email, member.email, deleted_member.email}
    assert memberships[owner.email].role == OrganizationRoles.owner
    assert memberships[member.email].role == OrganizationRoles.write
    assert memberships[deleted_member.email].role == OrganizationRoles.read
    assert memberships[owner.email].deleted_at is None
    assert memberships[member.email].deleted_at is None
    assert memberships[deleted_member.email].deleted_at is not None


async def test_create_allows_creating_compute(users: tuple[User, User, User]) -> None:
    """Create Organizations queued behind their creating compute target."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, infrastructure.compute.id)
        assert registry is not None
        registry.status = Status.creating
        await session.commit()

    # Act
    organization = await create_organization(owner, infrastructure=infrastructure)

    # Assert
    async with session_scope() as session:
        assert await organizations.fetch(session) == [organization]
        reloaded_compute = await session.get(ComputeRegistry, infrastructure.compute.id)
        assert reloaded_compute is not None
        assert reloaded_compute.status == Status.creating
        assert len(await operations.fetch(session)) == 1


async def test_soft_delete_cascades_nested_organization_rows(users: tuple[User, User, User]) -> None:
    """Soft-delete an organization and its nested application and access rows."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await session.execute(update(Organization).where(col(Organization.id) == organization.id).values(status=Status.running))
        application = await applications.create(
            session,
            organization.id,
            "Dashboard",
            Image("ghcr.io/longlink/dashboard@sha256:test"),
            owner.id,
            {},
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
        deleted_application = await session.get(Application, application.id)
        second_delete = await organizations.soft_delete(session, organization.id, owner)
        missing_delete = await organizations.soft_delete(session, uuid4(), owner)
        await session.commit()

    # Assert
    assert result is not None
    assert result.deleted_id == owner.id
    assert deleted_organization is not None
    assert deleted_organization.deleted_id == owner.id
    async with session_scope() as session:
        assert await organizations.members(session, organization.id) == []
        assert await organizations.invitations(session, organization.id) == []
        assert await organizations.applications(session, organization.id) == []
    assert deleted_application is not None
    assert deleted_application.deleted_id == owner.id
    assert second_delete is not None
    assert second_delete.id == result.id
    assert missing_delete is None
