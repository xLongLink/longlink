from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def fetch() -> list[User]:
    """Return all users in the database."""

    # Read users through a managed database session.
    async with session_scope() as session:
        return list(await session.scalars(select(User)))


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
