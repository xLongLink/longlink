import pytest
from uuid import uuid4
from types import SimpleNamespace
from fastapi import HTTPException
from factories import create_ready_location
from src.environments import env
from src.models.roles import OrganizationRoles
from longlink.utils.time import utcnow
from src.models.statuses import LocationStatus
from src.database.session import get_session
from src.database.services import locations, operations, invitations, organizations
from src.models.operations import OperationStatus
from src.database.models.users import User
from src.database.models.invitations import OrganizationInvitation

db = SimpleNamespace(
    invitations=invitations,
    locations=locations,
    operations=operations,
    organizations=organizations,
)


async def test_create_normalizes_invitation_email_and_lists_active_invitations(
    users: tuple[User, User, User],
) -> None:
    """Normalize invitation email addresses before storing and listing them."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner, slug="primary", name="Primary")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

    # Act
    invitation = await db.invitations.create(
        organization.id,
        "  Invited@Example.COM  ",
        OrganizationRoles.write,
        owner,
    )
    invitations = await db.organizations.invitations(organization.id)
    reloaded_location = await db.locations.get(location.id)
    open_operations = [item for item in await db.operations.fetch() if item.stopped_at is None]

    # Assert
    assert invitation.email == "invited@example.com"
    assert invitation.role == OrganizationRoles.write
    assert invitation.created_id == owner.id
    assert invitation.updated_id == owner.id
    assert [item.id for item in invitations] == [invitation.id]
    assert reloaded_location is not None
    assert reloaded_location.status == LocationStatus.ready
    assert reloaded_location.version == env.VERSION
    assert len(open_operations) == 1
    assert open_operations[0].location_id == location.id
    assert open_operations[0].platform_version == env.VERSION
    assert open_operations[0].status == OperationStatus.scheduled


async def test_create_rejects_invitation_for_missing_organization(users: tuple[User, User, User]) -> None:
    """Reject invitations for organizations that do not exist."""

    # Arrange
    owner = users[0]
    organization_id = uuid4()

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.invitations.create(organization_id, "invited@example.com", OrganizationRoles.write, owner)

    # Assert
    assert exc.value.status_code == 404
    assert exc.value.detail == "Organization not found"


async def test_create_rejects_invitation_for_existing_member_email(users: tuple[User, User, User]) -> None:
    """Reject invitations for users that already belong to the organization."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner, slug="primary", name="Primary")
    organization = await db.organizations.create("acme", "acme", location.id, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.invitations.create(organization.id, owner.email.upper(), OrganizationRoles.write, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "User is already a member"


async def test_create_rejects_duplicate_invitation_email_case_insensitively(users: tuple[User, User, User]) -> None:
    """Reject duplicate pending invitations even when email case differs."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner, slug="primary", name="Primary")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    await db.invitations.create(organization.id, "invited@example.com", OrganizationRoles.write, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.invitations.create(organization.id, "INVITED@example.com", OrganizationRoles.admin, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Invitation already exists"


async def test_organization_invitations_ignore_deleted_invitations(users: tuple[User, User, User]) -> None:
    """Exclude soft-deleted invitations from organization invitation lists."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner, slug="primary", name="Primary")
    organization = await db.organizations.create("acme", "acme", location.id, owner)
    invitation = await db.invitations.create(organization.id, "invited@example.com", OrganizationRoles.write, owner)

    Session = await get_session()
    async with Session() as session:
        deleted_invitation = await session.get(OrganizationInvitation, invitation.id)
        assert deleted_invitation is not None
        deleted_invitation.deleted_at = utcnow()
        deleted_invitation.deleted_id = owner.id
        await session.commit()

    # Act
    invitations = await db.organizations.invitations(organization.id)

    # Assert
    assert invitations == []
