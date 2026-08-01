from pwdlib import PasswordHash
from sqlmodel import col
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from collections.abc import Sequence
from src.environments import env
from src.models.roles import PlatformRoles
from src.database.session import session_scope
from src.database.models.users import User


async def fetch() -> Sequence[User]:
    """Return all users in the database."""

    # Read users through a managed database session.
    async with session_scope() as session:
        return (await session.scalars(select(User))).all()


async def ensure_administrator() -> None:
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
        if not created:
            if not hasher.verify(env.ADMIN_PASSWORD, user.hashed_password):
                user.hashed_password = hasher.hash(env.ADMIN_PASSWORD)
            user.name = env.ADMIN_NAME
            user.role = PlatformRoles.administrator
            user.deleted_at = None

        await session.commit()
