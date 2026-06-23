from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from src.models.roles import OrganizationRoles, PlatformRoles
from src.models.users import (
    Accent,
    Language,
    Radius,
    Theme,
    UserOrganizationMembership,
    UserProfile,
)
from src.models.locations import LocationResponse
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization

ADMIN_EMAIL = 'example@longlink.dev'
ADMIN_ORG = 'test'


class UsersService:
    async def list(self) -> list[User]:
        """Return all users in the database."""

        async with session_scope() as session:
            result = await session.execute(select(User))
            return result.scalars().all()


    async def get_by_id(self, user_id: UUID) -> User | None:
        """Return one user by id."""

        async with session_scope() as session:
            statement = select(User).where(User.id == user_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def profile(self, user_id: str) -> UserProfile | None:
        """Return one user profile with membership roles included."""

        async with session_scope() as session:
            # Preload the organization locations so response serialization does not trigger lazy IO.
            user_result = await session.execute(select(User).where(User.id == user_id))
            user = user_result.scalars().first()
            if user is None:
                return None

            # Load organization memberships and their locations without lazy IO.
            org_result = await session.execute(
                select(Organization, UserOrganization.role_name)
                .join(UserOrganization, Organization.id == UserOrganization.organization_id)
                .options(
                    selectinload(Organization.location),
                )
                .where(UserOrganization.user_id == user.id)
            )

            return UserProfile(
                id=user.id,
                name=user.name,
                email=user.email,
                avatar=user.avatar,
                role=user.role,
                theme=user.theme,
                accent=user.accent,
                radius=user.radius,
                language=user.language,
                oidc=user.oidc,
                organizations=[
                    UserOrganizationMembership(
                        id=organization.id,
                        name=organization.name,
                        avatar=organization.avatar,
                        location=LocationResponse.model_validate(organization.location),
                        role=role_name,
                    )
                    for organization, role_name in org_result.all()
                ],
            )

    async def _ensure_admin_membership(self, session, user: User) -> None:
        """Attach the seeded admin account to the demo org when it exists."""

        # Only the seeded admin email should get the demo org membership.
        if user.email != ADMIN_EMAIL:
            return

        # Skip the bootstrap membership if the demo org has not been created yet.
        organization_result = await session.execute(select(Organization).where(Organization.name == ADMIN_ORG))
        organization = organization_result.scalar_one_or_none()
        if organization is None:
            return

        # Avoid duplicating the owner row when the user already belongs to the org.
        membership_result = await session.execute(
            select(UserOrganization).where(
                UserOrganization.user_id == user.id,
                UserOrganization.organization_id == organization.id,
            )
        )
        if membership_result.scalar_one_or_none() is not None:
            return

        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=organization.id,
                role_name=OrganizationRoles.owner,
                created_id=user.id,
                updated_id=user.id,
            )
        )
        await session.commit()

    async def upsert(
        self,
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

        existing_user = await self.get(oidc)

        # Patch the current record in place when the subject already exists.
        if existing_user is not None:
            if email is not None:
                existing_user.email = email
            if name is not None:
                existing_user.name = name
            if avatar is not None:
                existing_user.avatar = avatar or ""
            if role is not None:
                existing_user.role = role
            if theme is not None:
                existing_user.theme = theme
            if accent is not None:
                existing_user.accent = accent
            if radius is not None:
                existing_user.radius = radius
            if language is not None:
                existing_user.language = language

            existing_user.oidc = oidc

            async with session_scope() as session:
                session.add(existing_user)
                await session.commit()
                await session.refresh(existing_user)

                await self._ensure_admin_membership(session, existing_user)

            return existing_user

        async with session_scope() as session:
            # Bootstrap the very first user as admin so the instance starts with one owner.
            user_result = await session.execute(select(func.count()).select_from(User))
            is_admin = user_result.scalar_one() == 0

            # New users need the identity fields that come from the auth provider.
            if name is None or email is None:
                raise ValueError("Missing user fields")

            # Resolve the platform role from explicit input, legacy flags, or the bootstrap default.
            if role is not None:
                resolved_role = role
            elif is_admin:
                resolved_role = PlatformRoles.administrator
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

            # Attach the admin membership after the user row exists and has an id.
            await self._ensure_admin_membership(session, user)

            return user

    async def get(self, oidc: str) -> User | None:
        """Retrieve a user by OIDC subject."""

        async with session_scope() as session:
            # Load memberships so the returned user can be used outside the session.
            statement = select(User).options(selectinload(User.organizations).selectinload(Organization.location)).where(User.oidc == oidc)
            result = await session.execute(statement)
            return result.scalars().first()


users = UsersService()
