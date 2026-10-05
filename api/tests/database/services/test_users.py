from pwdlib import PasswordHash
from datetime import UTC, datetime
from sqlmodel import col
from sqlalchemy import select
from src.environments import env
from src.database.session import session_scope
from src.database.services import users as user_service
from src.models.pagination import Pagination
from src.database.models.users import User


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
        page, total = await user_service.fetch_page(session, Pagination(page_size=3))

    # Assert
    assert active is not None
    assert active.id == active_user.id
    assert deleted is None
    assert by_email is not None
    assert by_email.id == deleted_user.id
    assert len(page) == 3
    assert deleted_user.id in {user.id for user in page}
    assert total == 3
