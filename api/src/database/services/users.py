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
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.location import Location
from src.database.models.organizations import Organization
from src.database.models.compute import ComputeRegistry
from src.database.models.storage import StorageRegistry
from src.database.models.database import DatabaseRegistry

ADMIN_EMAIL = 'example@longlink.dev'
ADMIN_ORG = 'test'


class UsersService:
    async def list(self) -> list[User]:
        """Return all users in the database."""

        async with session_scope() as session:
            result = await session.execute(select(User))
            return result.scalars().all()


    async def get_by_id(self, user_id: str) -> User | None:
        """Return one user by id."""

        async with session_scope() as session:
            statement = select(User).where(User.id == user_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def profile(self, user_id: str) -> UserProfile | None:
        """Return one user profile with membership roles included."""

        async with session_scope() as session:
            # Preload the nested location tree so response serialization does not trigger lazy IO.
            user_result = await session.execute(select(User).where(User.id == user_id))
            user = user_result.scalars().first()
            if user is None:
                return None

            org_result = await session.execute(
                select(Organization, UserOrganization.role_name)
                .join(UserOrganization, Organization.id == UserOrganization.organization_id)
                .options(
                    selectinload(Organization.location)
                    .selectinload(Location.organizations)
                    .selectinload(Organization.created_by),
                    selectinload(Organization.location)
                    .selectinload(Location.organizations)
                    .selectinload(Organization.updated_by),
                    selectinload(Organization.location)
                    .selectinload(Location.organizations)
                    .selectinload(Organization.deleted_by),
                    selectinload(Organization.location)
                    .selectinload(Location.compute_registries)
                    .selectinload(ComputeRegistry.created_by),
                    selectinload(Organization.location)
                    .selectinload(Location.compute_registries)
                    .selectinload(ComputeRegistry.updated_by),
                    selectinload(Organization.location)
                    .selectinload(Location.compute_registries)
                    .selectinload(ComputeRegistry.deleted_by),
                    selectinload(Organization.location)
                    .selectinload(Location.storage_registries)
                    .selectinload(StorageRegistry.created_by),
                    selectinload(Organization.location)
                    .selectinload(Location.storage_registries)
                    .selectinload(StorageRegistry.updated_by),
                    selectinload(Organization.location)
                    .selectinload(Location.storage_registries)
                    .selectinload(StorageRegistry.deleted_by),
                    selectinload(Organization.location)
                    .selectinload(Location.database_registries)
                    .selectinload(DatabaseRegistry.created_by),
                    selectinload(Organization.location)
                    .selectinload(Location.database_registries)
                    .selectinload(DatabaseRegistry.updated_by),
                    selectinload(Organization.location)
                    .selectinload(Location.database_registries)
                    .selectinload(DatabaseRegistry.deleted_by),
                )
                .where(UserOrganization.user_id == user.id)
            )

            payload = user.model_dump()
            payload["admin"] = user.role == PlatformRoles.administrator
            payload["oidc"] = user.oidc
            payload["organizations"] = [
                UserOrganizationMembership(
                    id=organization.id,
                    name=organization.name,
                    avatar=organization.avatar,
                    role=role_name,
                )
                for organization, role_name in org_result.all()
            ]

            return UserProfile.model_validate(payload)

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
        admin: bool | None = None,
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
            elif admin is not None:
                existing_user.role = PlatformRoles.administrator if admin else PlatformRoles.user
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
            elif admin is not None:
                resolved_role = PlatformRoles.administrator if admin else PlatformRoles.user
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
