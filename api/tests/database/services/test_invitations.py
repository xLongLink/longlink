import pytest
from fastapi import HTTPException
from datetime import UTC, datetime, timedelta
from sqlmodel import col, select
from factories import create_organization
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
            # Resolve the invitation persisted by the service under test.
            select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id)
        )

        # Inspect persisted invitation state rather than only the service response.
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


async def test_accept_rejects_expired_invitation(users: tuple[User, User, User]) -> None:
    """Reject an invitation at the seven-day expiration boundary without creating membership."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    expired_invitation = OrganizationInvitation(
        organization_id=organization.id,
        email=invitee.email,
        role=OrganizationRoles.write,
        created_at=datetime.now(UTC) - timedelta(days=7, seconds=1),
    )
    invitation_id = expired_invitation.id

    # Persist expired proof before requesting its replacement.
    async with session_scope() as session:
        session.add(expired_invitation)
        await session.commit()

    # Act
    async with session_scope() as session:
        with pytest.raises(HTTPException) as error:
            await invitations.accept(session, invitee, invitation_id)
        membership = await session.get(UserOrganization, (invitee.id, organization.id))

    # Assert
    assert error.value.status_code == 404
    assert membership is None


async def test_accept_preserves_active_membership_role(users: tuple[User, User, User]) -> None:
    """Consume an invitation without changing an active membership role."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    pending_invitation = OrganizationInvitation(organization_id=organization.id, email=invitee.email, role=OrganizationRoles.admin)
    invitation_id = pending_invitation.id
    async with session_scope() as session:
        session.add(UserOrganization(user_id=invitee.id, organization_id=organization.id, role=OrganizationRoles.read))
        session.add(pending_invitation)
        await session.commit()

    # Act
    async with session_scope() as session:
        await invitations.accept(session, invitee, invitation_id)
        await session.commit()
        membership = await session.get(UserOrganization, (invitee.id, organization.id))
        invitation = await session.scalar(
            select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id)
        )

    # Assert
    assert membership is not None
    assert membership.role == OrganizationRoles.read
    assert invitation is None


async def test_accept_rejects_invitations_for_deleted_organizations(users: tuple[User, User, User]) -> None:
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

        # Tombstoned Organizations must not remain available through invitation proof.
        organization_row.deleted_at = datetime.now(UTC)
        await session.commit()

    # Act
    async with session_scope() as session:
        with pytest.raises(HTTPException) as error:
            await invitations.accept(session, invitee, invitation_id)
        membership = await session.get(UserOrganization, (invitee.id, organization.id))
        invitation = await session.scalar(
            select(OrganizationInvitation).where(col(OrganizationInvitation.organization_id) == organization.id)
        )

    # Assert
    assert error.value.status_code == 404
    assert membership is None
    assert invitation is not None
    assert invitation.id == invitation_id
    assert invitation.organization_id == organization.id
    assert invitation.role == OrganizationRoles.write
