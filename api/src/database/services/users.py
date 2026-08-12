from uuid import UUID
from pwdlib import PasswordHash
from typing import cast
from sqlmodel import col
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import QueryableAttribute, contains_eager
from collections.abc import Sequence
from src.environments import env
from src.models.roles import PlatformRoles
from src.models.users import UserUpdate
from longlink.shared.models import Email
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def fetch(session: AsyncSession) -> Sequence[User]:
    """Return all users in the database."""

    # Read users through a managed database session.
    result = await session.scalars(select(User))
    return result.all()


async def active(session: AsyncSession, user_id: UUID) -> User | None:
    """Return one active user through an existing request session."""

    # Resolve only the authenticated identity; resource access remains scoped to its target.
    return await session.scalar(
        select(User).where(
            col(User.id) == user_id,
            col(User.deleted_at).is_(None),
        )
    )


async def by_email(session: AsyncSession, email: Email) -> User | None:
    """Return one user by email, including soft-deleted accounts."""

    # Account-existence checks must include deleted rows because email addresses remain unique.
    return await session.scalar(select(User).where(col(User.email) == email))


async def register(session: AsyncSession, name: str, email: str, password: str) -> User:
    """Add one user and assign its database-generated state without committing."""

    # Flush so callers can handle uniqueness errors within their existing transaction.
    user = User(name=name, email=email, password=PasswordHash.recommended().hash(password))
    session.add(user)
    await session.flush()
    return user


def replace_password(user: User, password: str) -> None:
    """Replace one user's password with a fresh secure hash."""

    user.password = PasswordHash.recommended().hash(password)


def update_profile(user: User, payload: UserUpdate) -> bool:
    """Apply changed profile fields and report whether the profile changed."""

    # Apply only supplied profile values that differ from their persisted counterparts.
    changed = False
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        if getattr(user, field) == value:
            continue
        setattr(user, field, value)
        changed = True
    return changed


async def memberships(session: AsyncSession, user_id: UUID) -> Sequence[UserOrganization]:
    """Return one user's active memberships with their active Organizations."""

    # Load membership response data without relying on async ORM lazy loading.
    statement = (
        select(UserOrganization)
        .join(Organization, col(Organization.id) == col(UserOrganization.organization_id))
        .options(contains_eager(cast(QueryableAttribute[Organization], UserOrganization.organization)))
        .where(
            col(UserOrganization.user_id) == user_id,
            col(UserOrganization.deleted_at).is_(None),
            col(Organization.deleted_at).is_(None),
        )
    )
    result = await session.scalars(statement)
    return result.all()


async def ensure_administrator(session: AsyncSession) -> None:
    """Reconcile the configured account as the sole Platform administrator."""

    # Reconcile the persisted administrator before considering an initial account creation.
    statement = select(User).where(col(User.email) == env.ADMIN_EMAIL)
    user = (await session.execute(select(User).where(col(User.role) == PlatformRoles.administrator))).scalar_one_or_none()
    password_hash = PasswordHash.recommended()

    # Match the configured identity only when no administrator has been created yet.
    if user is None:
        user = (await session.execute(statement)).scalar_one_or_none()
    if user is None:
        user = User(name=env.ADMIN_NAME, email=env.ADMIN_EMAIL, password=password_hash.hash(env.ADMIN_PASSWORD))

        # Concurrent Platform startup may create the configured administrator first.
        try:
            async with session.begin_nested():
                session.add(user)
                await session.flush()
        except IntegrityError:
            user = (await session.execute(statement)).scalar_one_or_none()
            if user is None:
                raise

    # Reconcile the configured account, including one created concurrently by another replica.
    if not password_hash.verify(env.ADMIN_PASSWORD, user.password):
        user.password = password_hash.hash(env.ADMIN_PASSWORD)
    user.name = env.ADMIN_NAME
    user.email = env.ADMIN_EMAIL
    user.role = PlatformRoles.administrator
    user.deleted_at = None
