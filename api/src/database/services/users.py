from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from src.models.roles import PlatformRoles
from src.models.users import Theme, Accent, Radius
from src.database.session import session_scope
from tenant.models.languages import Language
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def fetch() -> list[User]:
    """Return all users in the database."""

    # Read users through a managed database session.
    async with session_scope() as session:
        result = await session.execute(select(User))
        return result.scalars().all()


async def get_by_id(user_id: UUID) -> User | None:
    """Return one user by id."""

    # Read the user through a managed database session.
    async with session_scope() as session:
        statement = select(User).where(User.id == user_id)
        result = await session.execute(statement)
        return result.scalar_one_or_none()


async def organization_memberships(user_id: UUID) -> list[tuple[Organization, UserOrganization]]:
    """Return active organization membership rows for one user."""

    # Load organization memberships and their locations without lazy IO.
    async with session_scope() as session:
        organization_result = await session.execute(
            select(Organization, UserOrganization)
            .join(UserOrganization, Organization.id == UserOrganization.organization_id)
            .options(selectinload(Organization.location))
            .where(
                UserOrganization.user_id == user_id,
                UserOrganization.deleted_at.is_(None),
                Organization.deleted_at.is_(None),
            )
        )

        return [(organization, membership) for organization, membership in organization_result.all()]


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
    """Create a new OIDC user or update an existing one."""

    existing_user = await get(oidc, include_deleted=True)

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

        existing_user.oidc = oidc

        # Persist the existing user changes in one transaction.
        async with session_scope() as session:
            session.add(existing_user)
            await session.commit()
            await session.refresh(existing_user)

        return existing_user

    # Create new users inside one managed session.
    async with session_scope() as session:
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
    """Retrieve a user by OIDC subject."""

    # Read the user through a managed database session.
    async with session_scope() as session:
        statement = select(User).where(User.oidc == oidc)

        # Eager-load resource relationships for request authentication when requested.
        if include_access:
            statement = statement.options(
                selectinload(User.organizations).selectinload(Organization.applications),
                selectinload(User.applications),
            )

        # Hide soft-deleted users unless explicitly requested.
        if not include_deleted:
            statement = statement.where(User.deleted_at.is_(None))

        result = await session.execute(statement)
        return result.scalars().first()
