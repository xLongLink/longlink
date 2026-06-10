from .base import ServiceBase
from sqlalchemy import func, select
from src.models import UserProfile, UserOrgMembership
from src.db.models import Org, User
from sqlalchemy.orm import selectinload
from src.models.roles import Roles
from src.models.users import Theme, Accent, Radius, Language
from src.db.models.association import UserOrganization

ADMIN_EMAIL = 'example@longlink.dev'
ADMIN_ORG = 'test'


class UsersService(ServiceBase):
    async def list(self) -> list[User]:
        """Return all users in the database."""

        async with self.session() as session:
            result = await session.execute(select(User))
            return result.scalars().all()


    async def get_by_id(self, user_id: int) -> User | None:
        """Return one user by id."""

        async with self.session() as session:
            statement = select(User).where(User.id == user_id)
            result = await session.execute(statement)
            return result.scalar_one_or_none()

    async def profile(self, user_id: int) -> UserProfile | None:
        """Return one user profile with membership roles included."""

        async with self.session() as session:
            user_result = await session.execute(select(User).where(User.id == user_id))
            user = user_result.scalars().first()
            if user is None:
                return None

            # Load organization roles from the association table so the profile stays accurate.
            org_result = await session.execute(
                select(
                    UserOrganization.organization_name,
                    UserOrganization.role_name,
                ).where(UserOrganization.user_id == user.id)
            )

            payload = user.model_dump()
            payload["orgs"] = [
                UserOrgMembership(name=organization_name, role=role_name)
                for organization_name, role_name in org_result.all()
            ]

            return UserProfile.model_validate(payload)

    async def _ensure_admin_membership(self, session, user: User) -> None:
        """Attach the seeded admin account to the demo org when it exists."""

        # Only the seeded admin email should get the demo org membership.
        if user.email != ADMIN_EMAIL:
            return

        org_result = await session.execute(select(Org).where(Org.name == ADMIN_ORG))
        org = org_result.scalar_one_or_none()
        if org is None:
            return

        membership_result = await session.execute(
            select(UserOrganization).where(
                UserOrganization.user_id == user.id,
                UserOrganization.organization_name == ADMIN_ORG,
            )
        )
        if membership_result.scalar_one_or_none() is not None:
            return

        session.add(
            UserOrganization(
                user_id=user.id,
                organization_name=ADMIN_ORG,
                role_name=Roles.owner,
            )
        )
        await session.commit()

    async def upsert(
        self,
        *,
        oidc_subject: str,
        email: str | None = None,
        name: str | None = None,
        avatar: str | None = None,
        admin: bool | None = None,
        theme: Theme | None = None,
        accent: Accent | None = None,
        radius: Radius | None = None,
        language: Language | None = None,
    ) -> User:
        """Create a new OIDC user or update an existing one."""

        existing_user = await self.get(oidc_subject)
        # Patch the current record in place when the subject already exists.
        if existing_user is not None:
            if email is not None:
                existing_user.email = email
            if name is not None:
                existing_user.name = name
            if avatar is not None:
                existing_user.avatar = avatar
            if admin is not None:
                existing_user.admin = admin
            if theme is not None:
                existing_user.theme = theme
            if accent is not None:
                existing_user.accent = accent
            if radius is not None:
                existing_user.radius = radius
            if language is not None:
                existing_user.language = language

            existing_user.oidc_subject = oidc_subject

            async with self.session() as session:
                session.add(existing_user)
                await session.commit()
                await session.refresh(existing_user)

                await self._ensure_admin_membership(session, existing_user)

            return existing_user

        async with self.session() as session:
            # Bootstrap the very first user as admin so the instance starts with one owner.
            user_result = await session.execute(select(func.count()).select_from(User))
            is_admin = user_result.scalar_one() == 0

            # New users need the identity fields that come from the auth provider.
            if name is None or email is None:
                raise ValueError("Missing user fields")

            user = User(
                name=name,
                email=email,
                avatar=avatar,
                oidc_subject=oidc_subject,
                admin=is_admin if admin is None else admin,
                theme=theme if theme is not None else Theme.dark,
                accent=accent if accent is not None else Accent.neutral,
                radius=radius if radius is not None else Radius.medium,
                language=language if language is not None else Language.en,
            )

            session.add(user)
            await session.commit()
            await session.refresh(user)

            await self._ensure_admin_membership(session, user)

            return user

    async def get(self, oidc_subject: str) -> User | None:
        """Retrieve a user by OIDC subject."""

        async with self.session() as session:
            # Load memberships so the returned user can be used outside the session.
            statement = select(User).options(
                selectinload(User.orgs).selectinload(Org.location),
            ).where(User.oidc_subject == oidc_subject)
            result = await session.execute(statement)
            return result.scalars().first()
