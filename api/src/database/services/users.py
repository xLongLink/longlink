from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from src.models.roles import PlatformRoles
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


async def upsert(
    *,
    oidc: str,
    email: str | None = None,
    name: str | None = None,
    avatar: str | None = None,
    role: PlatformRoles | None = None,
    theme: Theme | None = None,
    accent: Accent | None = None,
    radius: Radius | None = None,
    language: Language | None = None,
) -> User:
    """Create or patch a LongLink Platform user by OIDC subject.

    Unless explicitly assigned, the first persisted user becomes the LongLink Platform administrator.
    """

    async with session_scope() as session:
        result = await session.execute(select(User).where(User.oidc == oidc))
        existing_user = result.scalar_one_or_none()

        # Patch the current record in place when the subject already exists.
        if existing_user is not None:
            # Refresh email when supplied.
            if email is not None:
                existing_user.email = email

            # Refresh name when supplied.
            if name is not None:
                existing_user.name = name

            # Refresh avatar when supplied.
            if avatar is not None:
                existing_user.avatar = avatar or ""

            # Refresh platform role when supplied.
            if role is not None:
                existing_user.role = role

            # Refresh theme when supplied.
            if theme is not None:
                existing_user.theme = theme

            # Refresh accent when supplied.
            if accent is not None:
                existing_user.accent = accent

            # Refresh radius when supplied.
            if radius is not None:
                existing_user.radius = radius

            # Refresh language when supplied.
            if language is not None:
                existing_user.language = language

            await session.commit()
            await session.refresh(existing_user)
            return existing_user

        # Bootstrap the very first user as admin so the instance starts with one owner.
        user_result = await session.execute(select(func.count()).select_from(User))
        is_admin = user_result.scalar_one() == 0

        # New users need the identity fields that come from the auth provider.
        if name is None or email is None:
            raise ValueError("Missing user fields")

        # Resolve the platform role from explicit input or the bootstrap default.
        if role is not None:
            resolved_role = role

        # Promote the first created user to administrator.
        elif is_admin:
            resolved_role = PlatformRoles.administrator

        # Use the standard platform role for later users.
        else:
            resolved_role = PlatformRoles.user

        user = User(
            name=name,
            email=email,
            avatar=avatar or "",
            oidc=oidc,
            role=resolved_role,
            theme=theme if theme is not None else Theme.dark,
            accent=accent if accent is not None else Accent.neutral,
            radius=radius if radius is not None else Radius.medium,
            language=language if language is not None else Language.en,
        )

        session.add(user)
        await session.commit()
        await session.refresh(user)

        return user


async def get(oidc: str, include_deleted: bool = False, include_access: bool = False) -> User | None:
    """Load a user by OIDC subject, optionally with Organization and LongLink Application access for authentication. Soft-deleted users are hidden by default."""

    # Read the user through a managed database session.
    async with session_scope() as session:
        statement = select(User).where(User.oidc == oidc)

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
