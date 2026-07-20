from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from src.models.users import Theme, Accent, Radius
from src.database.session import session_scope
from longlink.models.languages import Language
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization
from src.database.models.organizations import Organization


async def fetch() -> list[User]:
    """Return all users in the database."""

    # Read users through a managed database session.
    async with session_scope() as session:
        result = await session.execute(select(User))
        return result.scalars().all()


async def update(
    *,
    user_id: UUID,
    name: str | None = None,
    avatar: str | None = None,
    theme: Theme | None = None,
    accent: Accent | None = None,
    radius: Radius | None = None,
    language: Language | None = None,
) -> User:
    """Patch one LongLink Platform user profile by local identifier."""

    async with session_scope() as session:
        user = await session.get(User, user_id)

        # Reject stale authenticated users rather than recreating profile state.
        if user is None:
            raise ValueError("User not found")

        # Apply only profile fields supplied by the caller.
        if name is not None:
            user.name = name
        if avatar is not None:
            user.avatar = avatar or ""
        if theme is not None:
            user.theme = theme
        if accent is not None:
            user.accent = accent
        if radius is not None:
            user.radius = radius
        if language is not None:
            user.language = language

        await session.commit()
        await session.refresh(user)
        return user


async def get(user_id: UUID, include_deleted: bool = False, include_access: bool = False) -> User | None:
    """Load a user by local identifier, optionally including resource access."""

    # Read the user through a managed database session.
    async with session_scope() as session:
        statement = select(User).where(User.id == user_id)

        # Eager-load resource relationships for request authentication when requested.
        if include_access:
            statement = statement.options(
                selectinload(User.organization_memberships)
                .selectinload(UserOrganization.organization)
                .selectinload(Organization.applications),
                selectinload(User.application_memberships).selectinload(UserApplication.application),
                selectinload(User.application_memberships).selectinload(UserApplication.organization),
            )

        # Hide soft-deleted users unless explicitly requested.
        if not include_deleted:
            statement = statement.where(User.deleted_at.is_(None))

        result = await session.execute(statement)
        return result.scalar_one_or_none()
