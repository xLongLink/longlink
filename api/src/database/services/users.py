from uuid import UUID
from pwdlib import PasswordHash
from typing import cast
from sqlmodel import col
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import QueryableAttribute, joinedload
from collections.abc import Sequence
from src.environments import env
from src.models.roles import PlatformRoles
from src.database.session import session_scope
from sqlalchemy.ext.asyncio import AsyncSession
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def fetch() -> Sequence[User]:
    """Return all users in the database."""

    # Read users through a managed database session.
    async with session_scope() as session:
        return (await session.scalars(select(User))).all()


async def active(session: AsyncSession, user_id: UUID) -> User | None:
    """Return one active user through an existing request session."""

    # Resolve only the authenticated identity; resource access remains scoped to its target.
    return (
        await session.scalars(
            select(User).where(
                col(User.id) == user_id,
                col(User.deleted_at).is_(None),
            )
        )
    ).one_or_none()


async def memberships(user_id: UUID) -> Sequence[UserOrganization]:
    """Return one user's active memberships with their active Organizations."""

    # Load membership response data without relying on async ORM lazy loading.
    async with session_scope() as session:
        statement = (
            select(UserOrganization)
            .join(Organization, col(Organization.id) == col(UserOrganization.organization_id))
            .options(joinedload(cast(QueryableAttribute[Organization], UserOrganization.organization)))
            .where(
                col(UserOrganization.user_id) == user_id,
                col(UserOrganization.deleted_at).is_(None),
                col(Organization.deleted_at).is_(None),
            )
        )
        return (await session.scalars(statement)).all()


async def ensure_administrator() -> None:
    """Reconcile the configured account as the sole Platform administrator."""

    # Reconcile the persisted administrator before considering an initial account creation.
    async with session_scope() as session:
        statement = select(User).where(func.lower(col(User.email)) == env.ADMIN_EMAIL)
        user = (await session.execute(select(User).where(col(User.role) == PlatformRoles.administrator))).scalar_one_or_none()
        password_hash = PasswordHash.recommended()

        # Match the configured identity only when no administrator has been created yet.
        if user is None:
            user = (await session.execute(statement)).scalar_one_or_none()
        if user is None:
            user = User(
                name=env.ADMIN_NAME,
                email=env.ADMIN_EMAIL,
                password=password_hash.hash(env.ADMIN_PASSWORD),
            )
            session.add(user)

            # Concurrent Platform startup may create the configured administrator first.
            try:
                await session.flush()
            except IntegrityError:
                await session.rollback()
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

        await session.commit()
