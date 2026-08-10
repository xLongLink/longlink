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
