from pwdlib import PasswordHash
from sqlmodel import col
from sqlalchemy import select
from src.environments import env
from longlink.utils.time import utcnow
from src.database.session import session_scope
from src.database.services import users
from src.database.models.users import User


async def test_ensure_administrator_creates_absent_configured_user() -> None:
    """Create the configured administrator when it is absent."""

    # Arrange
    password_hash = PasswordHash.recommended()

    # Act
    async with session_scope() as session:
        await users.ensure_administrator(session)
        await session.commit()

    # Assert
    async with session_scope() as session:
        administrators = (await session.scalars(select(User).where(col(User.administrator).is_(True)))).all()
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
        await users.ensure_administrator(session)
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
        await users.ensure_administrator(session)
        await session.commit()

    # Assert
    async with session_scope() as session:
        persisted_administrator = await session.get(User, administrator_id)
    assert persisted_administrator is not None
    assert persisted_administrator.password != stale_password
    assert password_hash.verify(env.ADMIN_PASSWORD, persisted_administrator.password)
