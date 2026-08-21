import pytest
from factories import create_organization
from src.errors import ConflictError
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.database.services import invitations
from src.database.models.users import User


async def test_create_stores_canonical_invitation_email(
    users: tuple[User, User, User],
) -> None:
    """Store a canonical invitation email address."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)

    # Act
    async with session_scope() as session:
        invitation = await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.write)
        await session.commit()

    # Assert
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
        invitation = await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.write)
        await session.commit()

        # Act
        replacement = await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.admin)
        await session.commit()

    # Assert
    assert replacement.id == invitation.id
    assert replacement.role == OrganizationRoles.admin
