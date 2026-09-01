import pytest
from pwdlib import PasswordHash
from sqlmodel import col
from factories import create_organization
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from src.environments import env
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import users as user_service
from src.models.pagination import Pagination
from src.database.models.users import User
from src.database.models.organizations import Organization


async def test_ensure_administrator_creates_absent_configured_user() -> None:
    """Create the configured administrator when it is absent."""

    # Arrange
    password_hash = PasswordHash.recommended()

    # Act
    async with session_scope() as session:
        await user_service.ensure_administrator(session)
        await session.commit()

    # Assert
    async with session_scope() as session:
        result = await session.scalars(select(User).where(col(User.administrator).is_(True)))
        administrators = result.all()
    assert len(administrators) == 1
    assert administrators[0].name == env.ADMIN_NAME
    assert administrators[0].email == env.ADMIN_EMAIL
    assert password_hash.verify(env.ADMIN_PASSWORD, administrators[0].password)
    assert administrators[0].deleted_at is None


async def test_ensure_administrator_restores_soft_deleted_configured_user(password_hash: str) -> None:
    """Restore the configured administrator when its account is soft-deleted."""

    # Arrange
    async with session_scope() as session:
        deleted_user = User(
            name="Deleted Administrator",
            email=env.ADMIN_EMAIL,
            password=password_hash,
            deleted_at=utcnow(),
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
    assert restored_user.name == env.ADMIN_NAME
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
            name=env.ADMIN_NAME,
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


async def test_ensure_administrator_uses_concurrently_created_configured_user(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reconcile the configured account when another replica wins the creation race."""

    # Arrange
    password_hash = PasswordHash.recommended()
    concurrent_administrator = User(
        name="Concurrent Administrator",
        email=env.ADMIN_EMAIL,
        password=password_hash.hash(env.ADMIN_PASSWORD),
    )
    scalar_calls = 0

    async def return_concurrent_administrator(_statement: object) -> User | None:
        """Model the configured account appearing after the unique-index conflict."""

        nonlocal scalar_calls
        scalar_calls += 1
        return None if scalar_calls == 1 else concurrent_administrator

    async def raise_unique_conflict() -> None:
        """Model another Platform replica creating the configured account first."""

        raise IntegrityError("INSERT", {}, Exception("unique constraint"))

    # Act
    async with session_scope() as session:
        monkeypatch.setattr(session, "scalar", return_concurrent_administrator)
        monkeypatch.setattr(session, "flush", raise_unique_conflict)
        await user_service.ensure_administrator(session)

    # Assert
    assert concurrent_administrator.name == env.ADMIN_NAME
    assert concurrent_administrator.administrator is True


async def test_ensure_administrator_propagates_unresolved_concurrent_creation(monkeypatch: pytest.MonkeyPatch) -> None:
    """Propagate the insert conflict when no concurrent administrator can be read."""

    # Arrange
    async def no_administrator(_statement: object) -> None:
        """Model both administrator reads returning no configured account."""

    async def raise_unique_conflict() -> None:
        """Model a competing Platform replica winning the insert race."""

        raise IntegrityError("INSERT", {}, Exception("unique constraint"))

    # Act and assert
    async with session_scope() as session:
        monkeypatch.setattr(session, "scalar", no_administrator)
        monkeypatch.setattr(session, "flush", raise_unique_conflict)
        with pytest.raises(IntegrityError):
            await user_service.ensure_administrator(session)


async def test_user_service_returns_active_accounts_and_all_administrator_records(
    users: tuple[User, User, User],
) -> None:
    """Return active identities while retaining deleted accounts in administrator lists."""

    # Arrange
    _administrator, active_user, deleted_user = users
    async with session_scope() as session:
        deleted_row = await session.get(User, deleted_user.id)
        assert deleted_row is not None
        deleted_row.deleted_at = utcnow()
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


async def test_user_service_registers_user_and_returns_active_organization_memberships(
    users: tuple[User, User, User],
) -> None:
    """Persist registrations and exclude deleted memberships and organizations."""

    # Arrange
    member = users[1]
    active_organization = await create_organization(member, name="active")
    deleted_organization = await create_organization(member, name="deleted")
    async with session_scope() as session:
        deleted_organization_row = await session.get(Organization, deleted_organization.id)
        assert deleted_organization_row is not None
        deleted_organization_row.deleted_at = utcnow()
        registered = await user_service.register(session, "Registered User", "registered@example.com", "test-password")
        await session.commit()

    # Act
    async with session_scope() as session:
        memberships = await user_service.memberships(session, member.id)
        organization_ids = await user_service.organization_ids(session, member.id)

    # Assert
    assert registered.id is not None
    assert registered.email == "registered@example.com"
    assert [membership.organization_id for membership in memberships] == [active_organization.id]
    assert list(organization_ids) == [active_organization.id]
