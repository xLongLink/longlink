import pytest
from datetime import UTC, datetime, timedelta
from sqlmodel import select
from factories import create_organization
from src.errors import ConflictError
from sqlalchemy.exc import IntegrityError
from src.models.roles import OrganizationRoles
from src.database.session import session_scope
from src.database.services import invitations
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


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

    # Act and assert
    async with session_scope() as session:
        with pytest.raises(ConflictError, match=r"^User is already a member$"):
            await invitations.create(session, organization.id, owner.email, OrganizationRoles.write)


async def test_create_replaces_existing_invitation(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace an existing grant when an email is invited again."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.write)
        await session.commit()
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))
        assert invitation is not None
        refreshed_at = datetime(2026, 8, 24, tzinfo=UTC)
        monkeypatch.setattr(invitations, "utcnow", lambda: refreshed_at)

        # Act
        await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.admin)
        await session.commit()
        replacement = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))

    # Assert
    assert replacement is not None
    assert replacement.id == invitation.id
    assert replacement.role == OrganizationRoles.admin
    assert replacement.created_at == refreshed_at


async def test_create_uses_concurrently_created_invitation(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply the requested role when another transaction creates the invitation first."""

    # Arrange
    organization = await create_organization(users[0])
    concurrent_invitation = OrganizationInvitation(
        organization_id=organization.id,
        email="invited@example.com",
        role=OrganizationRoles.read,
    )
    responses = iter((None, None, concurrent_invitation))

    async def return_concurrent_invitation(_statement: object) -> OrganizationInvitation | None:
        """Model the invitation appearing after the unique-index conflict."""

        return next(responses)

    async def raise_unique_conflict() -> None:
        """Model the competing transaction winning the insert race."""

        raise IntegrityError("INSERT", {}, Exception("unique constraint"))

    # Act
    async with session_scope() as session:
        monkeypatch.setattr(session, "scalar", return_concurrent_invitation)
        monkeypatch.setattr(session, "flush", raise_unique_conflict)
        await invitations.create(session, organization.id, concurrent_invitation.email, OrganizationRoles.admin)

    # Assert
    assert concurrent_invitation.role == OrganizationRoles.admin


async def test_create_rejects_unresolved_concurrent_invitation(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Report a conflict when the winning concurrent invitation cannot be read."""

    # Arrange
    organization = await create_organization(users[0])

    async def no_invitation(_statement: object) -> None:
        """Model both reads completing before the competing insert is visible."""

    async def raise_unique_conflict() -> None:
        """Model a competing transaction winning the invitation insert race."""

        raise IntegrityError("INSERT", {}, Exception("unique constraint"))

    # Act and assert
    async with session_scope() as session:
        monkeypatch.setattr(session, "scalar", no_invitation)
        monkeypatch.setattr(session, "flush", raise_unique_conflict)
        with pytest.raises(ConflictError, match=r"^Invitation could not be created$"):
            await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.write)


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


async def test_accept_removes_expired_invitation_without_creating_membership(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject and consume an invitation at the seven-day expiration boundary."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    now = datetime(2026, 8, 30, tzinfo=UTC)
    async with session_scope() as session:
        session.add(
            OrganizationInvitation(
                organization_id=organization.id,
                email=invitee.email,
                role=OrganizationRoles.write,
                created_at=now - timedelta(days=7),
            )
        )
        await session.commit()
    monkeypatch.setattr(invitations, "utcnow", lambda: now)

    # Act
    async with session_scope() as session:
        changed_organization_ids = await invitations.accept(session, invitee)
        await session.commit()
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))
        membership = await session.get(UserOrganization, (invitee.id, organization.id))

    # Assert
    assert changed_organization_ids == set()
    assert invitation is None
    assert membership is None


async def test_accept_restores_deleted_membership_with_invited_role(users: tuple[User, User, User]) -> None:
    """Restore a deleted membership using the accepted invitation role."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=invitee.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
                deleted_at=datetime.now(UTC),
                deleted_id=owner.id,
            )
        )
        await invitations.create(session, organization.id, invitee.email, OrganizationRoles.admin)
        await session.commit()

    # Act
    async with session_scope() as session:
        changed_organization_ids = await invitations.accept(session, invitee)
        await session.commit()
        membership = await session.get(UserOrganization, (invitee.id, organization.id))

    # Assert
    assert changed_organization_ids == {organization.id}
    assert membership is not None
    assert membership.role == OrganizationRoles.admin
    assert membership.deleted_at is None
    assert membership.deleted_id is None


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
        changed_organization_ids = await invitations.accept(session, invitee)
        await session.commit()
        membership = await session.get(UserOrganization, (invitee.id, organization.id))
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))

    # Assert
    assert changed_organization_ids == set()
    assert membership is not None
    assert membership.role == OrganizationRoles.read
    assert invitation is None


async def test_accept_ignores_invitations_for_deleted_organizations(users: tuple[User, User, User]) -> None:
    """Keep invitations untouched when their organization has been deleted."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        await invitations.create(session, organization.id, invitee.email, OrganizationRoles.write)
        organization_row = await session.get(Organization, organization.id)
        assert organization_row is not None
        organization_row.deleted_at = datetime.now(UTC)
        organization_row.deleted_id = owner.id
        await session.commit()

    # Act
    async with session_scope() as session:
        changed_organization_ids = await invitations.accept(session, invitee)
        membership = await session.get(UserOrganization, (invitee.id, organization.id))
        invitation = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))

    # Assert
    assert changed_organization_ids == set()
    assert membership is None
    assert invitation is not None
