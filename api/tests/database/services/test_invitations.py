import pytest
from uuid import uuid4
from fastapi import HTTPException
from factories import create_organization, create_ready_infrastructure
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.database.session import get_session
from src.database.services import invitations, organizations
from src.database.models.users import User
from src.database.models.invitations import OrganizationInvitation


async def test_create_normalizes_invitation_email_and_lists_active_invitations(
    users: tuple[User, User, User],
) -> None:
    """Normalize invitation email addresses before storing and listing them."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner, slug="primary", name="Primary")
    organization = await create_organization(infrastructure, owner)

    # Act
    invitation = await invitations.create(
        organization.id,
        "  Invited@Example.COM  ",
        OrganizationRoles.write,
        owner,
    )
    invitation_rows = await organizations.invitations(organization.id)

    # Assert
    assert invitation.email == "invited@example.com"
    assert invitation.role == OrganizationRoles.write
    assert invitation.created_id == owner.id
    assert invitation.updated_id == owner.id
    assert [item.id for item in invitation_rows] == [invitation.id]


async def test_create_rejects_invitation_for_missing_organization(users: tuple[User, User, User]) -> None:
    """Reject invitations for organizations that do not exist."""

    # Arrange
    owner = users[0]
    organization_id = uuid4()

    # Act
    with pytest.raises(HTTPException) as exc:
        await invitations.create(organization_id, "invited@example.com", OrganizationRoles.write, owner)

    # Assert
    assert exc.value.status_code == 404
    assert exc.value.detail == "Organization not found"


async def test_create_rejects_invitation_for_existing_member_email(users: tuple[User, User, User]) -> None:
    """Reject invitations for users that already belong to the organization."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner, slug="primary", name="Primary")
    organization = await create_organization(infrastructure, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await invitations.create(organization.id, owner.email.upper(), OrganizationRoles.write, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "User is already a member"


async def test_create_rejects_duplicate_invitation_email_case_insensitively(users: tuple[User, User, User]) -> None:
    """Reject duplicate pending invitations even when email case differs."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner, slug="primary", name="Primary")
    organization = await create_organization(infrastructure, owner)
    await invitations.create(organization.id, "invited@example.com", OrganizationRoles.write, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await invitations.create(organization.id, "INVITED@example.com", OrganizationRoles.admin, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Invitation already exists"


async def test_organization_invitations_ignore_deleted_invitations(users: tuple[User, User, User]) -> None:
    """Exclude soft-deleted invitations from organization invitation lists."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner, slug="primary", name="Primary")
    organization = await create_organization(infrastructure, owner)
    invitation = await invitations.create(organization.id, "invited@example.com", OrganizationRoles.write, owner)

    Session = await get_session()
    async with Session() as session:
        deleted_invitation = await session.get(OrganizationInvitation, invitation.id)
        assert deleted_invitation is not None
        deleted_invitation.deleted_at = utcnow()
        deleted_invitation.deleted_id = owner.id
        await session.commit()

    # Act
    invitation_rows = await organizations.invitations(organization.id)

    # Assert
    assert invitation_rows == []
