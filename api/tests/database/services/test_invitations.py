import pytest
from datetime import UTC, datetime, timedelta
from sqlmodel import col, select
from factories import create_organization
from sqlalchemy import Select
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.database.services import invitations, organizations
from src.models.organizations import OrganizationInvitationCreate
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def test_create_replaces_existing_invitation(users: tuple[User, User, User]) -> None:
    """Replace an existing grant when the canonical email is invited again."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await organizations.create_invitation(
            session, organization.id, OrganizationInvitationCreate(email="Invited@EXAMPLE.COM", role=OrganizationRoles.write), owner.id
        )
        await session.commit()
        invitation = await session.scalar(
            select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id)
        )
        assert invitation is not None
        assert invitation.email == "invited@example.com"
        assert invitation.role == OrganizationRoles.write
        invitation_id = invitation.id
        original_created_at = datetime(2026, 1, 1, tzinfo=UTC)
        invitation.created_at = original_created_at
        await session.commit()

        # Act
        await organizations.create_invitation(
            session, organization.id, OrganizationInvitationCreate(email="invited@example.com", role=OrganizationRoles.admin), owner.id
        )
        await session.commit()

    # Read committed replacement values independently of the original identity map.
    async with session_scope() as session:
        replacement = await session.scalar(
            select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id)
        )

    # Assert
    assert replacement is not None
    assert replacement.id == invitation_id
    assert replacement.role == OrganizationRoles.admin
    assert replacement.created_at > original_created_at


async def test_create_uses_concurrently_created_invitation(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply the requested role when another transaction creates the invitation first."""

    # Arrange
    organization = await create_organization(users[0])
    original_created_at = datetime(2026, 1, 1, tzinfo=UTC)
    concurrent_invitation = OrganizationInvitation(
        organization_id=organization.id,
        email="invited@example.com",
        role=OrganizationRoles.read,
        created_at=original_created_at,
    )
    async with session_scope() as session:
        session.add(concurrent_invitation)
        await session.commit()

    # Act
    async with session_scope() as session:
        scalar = session.scalar

        async def suppress_first_invitation[T](statement: Select[tuple[T]]) -> T | None:
            """Hide only the first invitation result to simulate a stale read."""

            # Run real queries and restore normal reads once the winning row is hidden.
            result = await scalar(statement)
            if isinstance(result, OrganizationInvitation):
                monkeypatch.setattr(session, "scalar", scalar)
                return None
            return result

        monkeypatch.setattr(session, "scalar", suppress_first_invitation)
        await organizations.create_invitation(
            session,
            organization.id,
            OrganizationInvitationCreate(email=concurrent_invitation.email, role=OrganizationRoles.admin),
            users[0].id,
        )
        await session.commit()

    # Read the committed grant independently of the recovering session's identity map.
    async with session_scope() as session:
        result = await session.scalars(select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id))
        replacement = result.one()

    # Assert
    assert replacement.id == concurrent_invitation.id
    assert replacement.email == concurrent_invitation.email
    assert replacement.role == OrganizationRoles.admin
    assert replacement.created_at > original_created_at


async def test_accept_removes_expired_invitation_without_creating_membership(
    users: tuple[User, User, User],
) -> None:
    """Reject and consume an invitation at the seven-day expiration boundary."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(
            OrganizationInvitation(
                organization_id=organization.id,
                email=invitee.email,
                role=OrganizationRoles.write,
                created_at=datetime.now(UTC) - timedelta(days=7, seconds=1),
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        await invitations.accept(session, invitee)
        await session.commit()
        invitation = await session.scalar(
            select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id)
        )
        membership = await session.get(UserOrganization, (invitee.id, organization.id))

    # Assert
    assert invitation is None
    assert membership is None


async def test_accept_preserves_active_membership_role(users: tuple[User, User, User]) -> None:
    """Consume an invitation without changing an active membership role."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=invitee.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
            )
        )
        session.add(
            OrganizationInvitation(
                organization_id=organization.id,
                email=invitee.email,
                role=OrganizationRoles.admin,
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        await invitations.accept(session, invitee)
        await session.commit()
        membership = await session.get(UserOrganization, (invitee.id, organization.id))
        invitation = await session.scalar(
            select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id)
        )

    # Assert
    assert membership is not None
    assert membership.role == OrganizationRoles.read
    assert invitation is None


async def test_accept_ignores_invitations_for_deleted_organizations(users: tuple[User, User, User]) -> None:
    """Keep invitations untouched when their organization has been deleted."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        original_invitation = OrganizationInvitation(organization_id=organization.id, email=invitee.email, role=OrganizationRoles.write)
        session.add(original_invitation)
        invitation_id = original_invitation.id
        organization_row = await session.get(Organization, organization.id)
        assert organization_row is not None
        organization_row.deleted_at = datetime.now(UTC)
        await session.commit()

    # Act
    async with session_scope() as session:
        await invitations.accept(session, invitee)
        membership = await session.get(UserOrganization, (invitee.id, organization.id))
        invitation = await session.scalar(
            select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id)
        )

    # Assert
    assert membership is None
    assert invitation is not None
    assert invitation.id == invitation_id
    assert invitation.organization_id == organization.id
    assert invitation.role == OrganizationRoles.write
