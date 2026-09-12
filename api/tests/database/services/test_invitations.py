import pytest
from datetime import UTC, datetime, timedelta
from sqlmodel import select
from factories import create_organization
from sqlalchemy import Select
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
        invitation_id = invitation.id
        refreshed_at = datetime(2026, 8, 24, tzinfo=UTC)
        monkeypatch.setattr(invitations, "utcnow", lambda: refreshed_at)

        # Act
        await invitations.create(session, organization.id, "invited@example.com", OrganizationRoles.admin)
        await session.commit()

    # Read committed replacement values independently of the original identity map.
    async with session_scope() as session:
        replacement = await session.scalar(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))

    # Assert
    assert replacement is not None
    assert replacement.id == invitation_id
    assert replacement.role == OrganizationRoles.admin
    assert replacement.created_at == refreshed_at


async def test_create_uses_concurrently_created_invitation(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply the requested role when another transaction creates the invitation first."""

    # Arrange
    organization = await create_organization(users[0])
    refreshed_at = datetime(2026, 8, 24, tzinfo=UTC)
    concurrent_invitation = OrganizationInvitation(
        organization_id=organization.id,
        email="invited@example.com",
        role=OrganizationRoles.read,
        created_at=refreshed_at - timedelta(days=1),
    )
    async with session_scope() as session:
        session.add(concurrent_invitation)
        await session.commit()
    monkeypatch.setattr(invitations, "utcnow", lambda: refreshed_at)

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
        await invitations.create(session, organization.id, concurrent_invitation.email, OrganizationRoles.admin)

        # The outer transaction remains usable after the failed insert's savepoint rolls back.
        assert await session.scalar(select(1)) == 1
        await session.commit()

    # Read the committed grant independently of the recovering session's identity map.
    async with session_scope() as session:
        result = await session.scalars(select(OrganizationInvitation).where(OrganizationInvitation.organization_id == organization.id))
        replacement = result.one()

    # Assert
    assert replacement.id == concurrent_invitation.id
    assert replacement.email == concurrent_invitation.email
    assert replacement.role == OrganizationRoles.admin
    assert replacement.created_at == refreshed_at


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


async def test_accept_removes_expired_invitation_without_creating_membership(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject and consume an invitation at the seven-day expiration boundary."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    now = datetime(2026, 8, 30, tzinfo=UTC)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.database_sync_pending = False
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
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_sync_pending is False


async def test_accept_restores_deleted_membership_with_invited_role(users: tuple[User, User, User]) -> None:
    """Restore a deleted membership using the accepted invitation role."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.database_sync_pending = False
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
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_sync_pending is True
        await session.rollback()

    # Membership, invitation consumption, and projection demand share the caller's rollback.
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_sync_pending is False
        membership = await session.get(UserOrganization, (invitee.id, organization.id))
        assert membership is not None
        assert membership.deleted_at is not None
        changed_organization_ids = await invitations.accept(session, invitee)
        await session.commit()
        membership = await session.get(UserOrganization, (invitee.id, organization.id))
        invitation = await session.scalar(
            select(OrganizationInvitation).where(
                OrganizationInvitation.organization_id == organization.id,
                OrganizationInvitation.email == invitee.email,
            )
        )

    # Assert
    assert changed_organization_ids == {organization.id}
    assert membership is not None
    assert membership.role == OrganizationRoles.admin
    assert membership.deleted_at is None
    assert membership.deleted_id is None
    assert invitation is None


async def test_accept_preserves_active_membership_role(users: tuple[User, User, User]) -> None:
    """Consume an invitation without changing an active membership role."""

    # Arrange
    owner, invitee = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.database_sync_pending = False
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
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        assert persisted.database_sync_pending is False


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
