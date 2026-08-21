import pytest
from sqlmodel import select
from factories import create_organization
from src.errors import ConflictError
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.database.services import invitations
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation


async def test_create_stores_canonical_invitation_email(
    users: tuple[User, User, User],
) -> None:
    """Store a canonical invitation email address."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    async with session_scope() as session:
        await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.write)
        await session.commit()

        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))

    # Assert
    assert invitation is not None
    assert invitation.email == "invited@example.com"
    assert invitation.role == OrganizationRoles.write


async def test_create_rejects_invitation_for_existing_member_email(users: tuple[User, User, User]) -> None:
    """Reject invitations for users that already belong to the organization."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    async with session_scope() as session:
        with pytest.raises(ConflictError) as exc:
            await invitations.create(session, organization.id, owner.email, OrganizationRoles.write)

    # Assert
    assert str(exc.value) == "User is already a member"


async def test_create_replaces_existing_invitation(users: tuple[User, User, User]) -> None:
    """Replace an existing grant when an email is invited again."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.write)
        await session.commit()
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))
        assert invitation is not None

        # Act
        await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.admin)
        await session.commit()
        replacement = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))

    # Assert
    assert replacement is not None
    assert replacement.id == invitation.id
    assert replacement.role == OrganizationRoles.admin


async def test_accept_creates_membership_and_consumes_invitation(users: tuple[User, User, User]) -> None:
    """Create membership access and consume the accepted invitation."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await invitations.create(session, organization.id, invitee.email, OrganizationRoles.write)
        await session.commit()

    # Act
    async with session_scope() as session:
        changed_organization_ids = await invitations.accept(session, invitee)
        await session.commit()
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))
        membership = await session.scalar(
            select(UserOrganization).where(
                UserOrganization.user_id == invitee.id,
                UserOrganization.organization_id == organization.id,
            )
        )

    # Assert
    assert changed_organization_ids == {organization.id}
    assert invitation is None
    assert membership is not None
    assert membership.role == OrganizationRoles.write
