from pwdlib import PasswordHash
from datetime import UTC, datetime
from sqlmodel import col
from factories import create_organization
from sqlalchemy import select
from src.environments import env
from src.database.session import session_scope
from src.database.services import users as user_service
from src.database.services import organizations as organization_service
from src.models.pagination import Pagination
from src.database.models.users import User
from src.database.models.organizations import Organization


async def test_ensure_administrator_creates_absent_configured_user() -> None:
    """Create the configured administrator and preserve its ID and credential hash on repeated reconciliation."""

    # Arrange
    password_hash = PasswordHash.recommended()

    # Act
    async with session_scope() as session:
        await user_service.ensure_administrator(session)
        await session.commit()

    # Assert
    async with session_scope() as session:
        result = await session.scalars(select(User).where(col(User.administrator).is_(True)))
        administrator = result.one()
    assert administrator.name == "Administrator"
    assert administrator.email == env.ADMIN_EMAIL
    assert password_hash.verify(env.ADMIN_PASSWORD, administrator.password)
    assert administrator.deleted_at is None

    # Arrange
    administrator_id = administrator.id
    administrator_password = administrator.password

    # Act
    async with session_scope() as session:
        await user_service.ensure_administrator(session)
        await session.commit()

    # Assert
    async with session_scope() as session:
        result = await session.scalars(select(User).where(col(User.administrator).is_(True)))
        persisted_administrator = result.one()
    assert persisted_administrator.id == administrator_id
    assert persisted_administrator.password == administrator_password


async def test_ensure_administrator_restores_soft_deleted_configured_user(password_hash: str) -> None:
    """Restore the configured administrator when its account is soft-deleted."""

    # Arrange
    async with session_scope() as session:
        deleted_user = User(
            name="Deleted Administrator",
            email=env.ADMIN_EMAIL,
            password=password_hash,
            deleted_at=datetime.now(UTC),
        )
        session.add(deleted_user)
        await session.commit()
        deleted_user_id = deleted_user.id

    # Act
    async with session_scope() as session:
        await user_service.ensure_administrator(session)
        await session.commit()

    # Assert
    async with session_scope() as session:
        restored_user = await session.get(User, deleted_user_id)
    assert restored_user is not None
    assert restored_user.name == "Administrator"
    assert restored_user.email == env.ADMIN_EMAIL
    assert restored_user.administrator is True
    assert restored_user.deleted_at is None


async def test_ensure_administrator_replaces_stale_configured_password() -> None:
    """Replace a configured administrator password that no longer matches settings."""

    # Arrange
    password_hash = PasswordHash.recommended()
    stale_password = password_hash.hash("stale-password")
    async with session_scope() as session:
        administrator = User(
            name="Administrator",
            email=env.ADMIN_EMAIL,
            password=stale_password,
            administrator=True,
        )
        session.add(administrator)
        await session.commit()
        administrator_id = administrator.id

    # Act
    async with session_scope() as session:
        await user_service.ensure_administrator(session)
        await session.commit()

    # Assert
    async with session_scope() as session:
        persisted_administrator = await session.get(User, administrator_id)
    assert persisted_administrator is not None
    assert persisted_administrator.password != stale_password
    assert password_hash.verify(env.ADMIN_PASSWORD, persisted_administrator.password)


async def test_ensure_administrator_reconciles_preexisting_configured_email() -> None:
    """Reconcile the configured account when another replica creates it first."""

    # Arrange
    password_hash = PasswordHash.recommended()
    async with session_scope() as session:
        session.add(
            User(
                name="Concurrent Administrator",
                email=env.ADMIN_EMAIL,
                password=password_hash.hash(env.ADMIN_PASSWORD),
            )
        )
        await session.commit()

    # Act
    async with session_scope() as session:
        reconciled = await user_service.ensure_administrator(session)
        await session.commit()
        reconciled_id = reconciled.id

    # Assert
    async with session_scope() as session:
        persisted = await session.get(User, reconciled_id)
    assert persisted is not None
    assert persisted.name == "Administrator"
    assert persisted.email == env.ADMIN_EMAIL
    assert persisted.administrator is True


async def test_user_service_returns_active_accounts_and_all_administrator_records(
    users: tuple[User, User, User],
) -> None:
    """Return active identities while retaining deleted accounts in administrator lists."""

    # Arrange
    _administrator, active_user, deleted_user = users
    async with session_scope() as session:
        deleted_row = await session.get(User, deleted_user.id)
        assert deleted_row is not None
        deleted_row.deleted_at = datetime.now(UTC)
        await session.commit()

    # Act
    async with session_scope() as session:
        active = await user_service.active(session, active_user.id)
        deleted = await user_service.active(session, deleted_user.id)
        by_email = await user_service.by_email(session, deleted_user.email)
        page, total = await user_service.fetch_page(session, Pagination(page_size=2))

    # Assert
    assert active is not None
    assert active.id == active_user.id
    assert deleted is None
    assert by_email is not None
    assert by_email.id == deleted_user.id
    assert len(page) == 2
    assert total == 3


async def test_organization_service_returns_active_user_memberships(
    users: tuple[User, User, User],
) -> None:
    """Persist registrations and exclude deleted organizations from memberships."""

    # Arrange
    password_hash = PasswordHash.recommended()
    member = users[1]
    active_organization = await create_organization(member, name="active")
    deleted_organization = await create_organization(member, name="deleted")
    async with session_scope() as session:
        deleted_organization_row = await session.get(Organization, deleted_organization.id)
        assert deleted_organization_row is not None
        deleted_organization_row.deleted_at = datetime.now(UTC)
        registered = await user_service.register(session, "Registered User", "registered@example.com", "test-password")
        await session.commit()

    # Act
    async with session_scope() as session:
        persisted_user = await session.get(User, registered.id)
        memberships = await organization_service.memberships(session, member.id)

    # Assert
    assert registered.id is not None
    assert persisted_user is not None
    assert persisted_user.email == "registered@example.com"
    assert password_hash.verify("test-password", persisted_user.password)
    assert [membership.organization_id for membership in memberships] == [active_organization.id]
