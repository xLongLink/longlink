from uuid import UUID
from pwdlib import PasswordHash
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlmodel import col
from sqlalchemy.orm import selectinload
from collections.abc import Sequence
from src.environments import env
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization
from src.models.roles import PlatformRoles


async def fetch() -> Sequence[User]:
    """Return all users in the database."""

    # Read users through a managed database session.
    async with session_scope() as session:
        return (await session.scalars(select(User))).all()


async def get(user_id: UUID, include_access: bool = False) -> User | None:
    """Load a user by local identifier, optionally including resource access."""

    # Read the active user through a managed database session.
    async with session_scope() as session:
        statement = select(User).where(User.id == user_id, User.deleted_at.is_(None))

        # Eager-load resource relationships for request authentication when requested.
        if include_access:
            statement = statement.options(
                selectinload(User.organization_memberships)
                .selectinload(UserOrganization.organization)
                .selectinload(Organization.applications),
            )

        return (await session.scalars(statement)).one_or_none()


async def ensure_administrator() -> tuple[User, bool]:
    """Create or repair the configured initial Platform administrator."""

    # Match the configured identity case-insensitively before reconciling its credentials and access.
    hasher = PasswordHash.recommended()
    async with session_scope() as session:
        statement = select(User).where(func.lower(col(User.email)) == env.ADMIN_EMAIL.casefold())
        user = (await session.execute(statement)).scalar_one_or_none()
        created = user is None
        if user is None:
            user = User(
                name=env.ADMIN_NAME,
                email=env.ADMIN_EMAIL,
                hashed_password=hasher.hash(env.ADMIN_PASSWORD),
                role=PlatformRoles.administrator,
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
                created = False

        # Reconcile an existing account, including one created concurrently by another replica.
        if created:
            changed = True
        else:
            verified = hasher.verify(env.ADMIN_PASSWORD, user.hashed_password)
            changed = (
                not verified
                or user.name != env.ADMIN_NAME
                or user.role != PlatformRoles.administrator
                or user.deleted_at is not None
            )
            if not verified:
                user.hashed_password = hasher.hash(env.ADMIN_PASSWORD)
            user.name = env.ADMIN_NAME
            user.role = PlatformRoles.administrator
            user.deleted_at = None

        await session.commit()
        return user, changed


async def administrator() -> User | None:
    """Return the configured Platform administrator."""

    # Match the configured administrator identity without loading unrelated Platform users.
    async with session_scope() as session:
        statement = select(User).where(func.lower(col(User.email)) == env.ADMIN_EMAIL.casefold())
        return (await session.execute(statement)).scalar_one_or_none()
