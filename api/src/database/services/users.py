from uuid import UUID
from pwdlib import PasswordHash
from sqlmodel import col
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from collections.abc import Sequence
from src.environments import env
from src.models.roles import PlatformRoles
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.association import UserOrganization


async def fetch() -> Sequence[User]:
    """Return all users in the database."""

    # Read users through a managed database session.
    async with session_scope() as session:
        return (await session.scalars(select(User))).all()


async def get(user_id: UUID, include_organizations: bool = False) -> User | None:
    """Load a user by local identifier, optionally including organization memberships."""

    # Read the active user through a managed database session.
    async with session_scope() as session:
        statement = select(User).where(User.id == user_id, User.deleted_at.is_(None))

        # Eager-load Organization access for detached request authorization.
        if include_organizations:
            statement = statement.options(
                selectinload(User.organization_memberships)
                .selectinload(UserOrganization.organization)
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
