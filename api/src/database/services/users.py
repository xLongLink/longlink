from uuid import UUID
from pwdlib import PasswordHash
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import contains_eager
from collections.abc import Sequence
from src.environments import env
from src.models.pagination import Pagination
from longlink.shared.models import Email
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def active(session: AsyncSession, user_id: UUID) -> User | None:
    """Return one active user through an existing request session."""

    # Resolve only the authenticated identity; resource access remains scoped to its target.
    return await session.scalar(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )


async def fetch_page(session: AsyncSession, pagination: Pagination) -> tuple[Sequence[User], int]:
    """Return one ordered page of Platform users for administrators."""

    # Preserve the existing administrator list visibility, including tombstoned users.
    statement = select(User).order_by(User.name, User.id).offset(pagination.offset).limit(pagination.page_size)
    result = await session.scalars(statement)

    # Count every Platform user visible in the administrator list.
    count_result = await session.execute(select(func.count()).select_from(User))
    return result.all(), count_result.scalar_one()


async def by_email(session: AsyncSession, email: Email) -> User | None:
    """Return one user by email, including soft-deleted accounts."""

    # Account-existence checks must include deleted rows because email addresses remain unique.
    return await session.scalar(select(User).where(User.email == email))


async def register(session: AsyncSession, name: str, email: str, password: str) -> User:
    """Add one user and assign its database-generated state without committing."""

    # Flush so callers can handle uniqueness errors within their existing transaction.
    user = User(name=name, email=email, password=PasswordHash.recommended().hash(password))
    session.add(user)
    await session.flush()
    return user


async def memberships(session: AsyncSession, user_id: UUID) -> Sequence[UserOrganization]:
    """Return one user's active memberships with their active Organizations."""

    # Load membership response data without relying on async ORM lazy loading.
    statement = (
        select(UserOrganization)
        .join(Organization, Organization.id == UserOrganization.organization_id)
        .options(contains_eager(UserOrganization.organization))
        .where(
            UserOrganization.user_id == user_id,
            UserOrganization.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
    )
    result = await session.scalars(statement)
    return result.all()


async def organization_ids(session: AsyncSession, user_id: UUID) -> Sequence[UUID]:
    """Return active Organization IDs for one user."""

    # Resolve synchronization targets without loading membership or Organization objects.
    statement = (
        select(UserOrganization.organization_id)
        .join(Organization, Organization.id == UserOrganization.organization_id)
        .where(
            UserOrganization.user_id == user_id,
            UserOrganization.deleted_at.is_(None),
            Organization.deleted_at.is_(None),
        )
    )
    result = await session.scalars(statement)
    return result.all()


async def ensure_administrator(session: AsyncSession) -> None:
    """Reconcile the configured account as the sole Platform administrator."""

    # Reconcile the persisted administrator before considering an initial account creation.
    statement = select(User).where(User.email == env.ADMIN_EMAIL)
    user = await session.scalar(select(User).where(User.administrator.is_(True)))
    password_hash = PasswordHash.recommended()

    # Match the configured identity only when no administrator has been created yet.
    if user is None:
        user = await session.scalar(statement)
    if user is None:
        user = User(name=env.ADMIN_NAME, email=env.ADMIN_EMAIL, password=password_hash.hash(env.ADMIN_PASSWORD))

        # Concurrent Platform startup may create the configured administrator first.
        try:
            async with session.begin_nested():
                session.add(user)
                await session.flush()
        except IntegrityError:
            user = await session.scalar(statement)
            if user is None:
                raise

    # Reconcile the configured account, including one created concurrently by another replica.
    if not password_hash.verify(env.ADMIN_PASSWORD, user.password):
        user.password = password_hash.hash(env.ADMIN_PASSWORD)
    user.name = env.ADMIN_NAME
    user.email = env.ADMIN_EMAIL
    user.administrator = True
    user.deleted_at = None
