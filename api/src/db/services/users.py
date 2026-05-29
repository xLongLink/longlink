from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from src.db.models import Org, User
from src.db.models.association import UserOrganization
from src.models import UserOrgMembership, UserProfile
from src.models.roles import Roles
from src.models.users import Accent, Radius, Theme

from .base import ServiceBase


ADMIN_EMAIL = 'example@longlink.dev'
ADMIN_ORG = 'test'


class UsersService(ServiceBase):
    async def list(self) -> list[User]:
        """Return all users in the database."""

        async with self.session() as session:
            result = await session.execute(select(User))
            return list(result.scalars().all())

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

    async def upsert(
        self,
        *,
        oidc_subject: str,
        email: str,
        name: str,
        avatar: str | None,
    ) -> User:
        '''Create a new OIDC user or update an existing one.'''

        existing_user = await self.get(oidc_subject)
        if existing_user is not None:
            return await self.update(
                existing_user.id,
                email=email,
                name=name,
                avatar=avatar,
                oidc_subject=oidc_subject,
                admin=existing_user.admin,
            ) or existing_user

        async with self.session() as session:
            # Bootstrap the very first user as admin so the instance starts with one owner.
            user_result = await session.execute(select(func.count()).select_from(User))
            is_admin = user_result.scalar_one() == 0

            user = User(
                name=name,
                email=email,
                avatar=avatar,
                oidc_subject=oidc_subject,
                admin=is_admin,
            )

            session.add(user)
            await session.commit()
            await session.refresh(user)

            if email == ADMIN_EMAIL:
                org_result = await session.execute(select(Org).where(Org.name == ADMIN_ORG))
                org = org_result.scalar_one_or_none()
                if org is None:
                    session.add(Org(name=ADMIN_ORG))

                membership_result = await session.execute(
                    select(UserOrganization).where(
                        UserOrganization.user_id == user.id,
                        UserOrganization.organization_name == ADMIN_ORG,
                    )
                )
                if membership_result.scalar_one_or_none() is None:
                    session.add(
                        UserOrganization(
                            user_id=user.id,
                            organization_name=ADMIN_ORG,
                            role_name=Roles.owner,
                        )
                    )

                await session.commit()

            return user

    async def get(self, oidc_subject: str) -> User | None:
        '''Retrieve a user by OIDC subject.'''

        async with self.session() as session:
            # Load memberships so the returned user can be used outside the session.
            statement = select(User).options(selectinload(User.orgs)).where(User.oidc_subject == oidc_subject)
            result = await session.execute(statement)
            return result.scalars().first()


    async def update(
        self,
        user_id: int,
        **params: str | int | Theme | Accent | Radius | None,
    ) -> User | None:
        '''Update a user and return the updated record.'''

        async with self.session() as session:
            result = await session.execute(select(User).where(User.id == user_id))
            user = result.scalars().first()
            if user is None:
                return None

            for key, value in params.items():
                if not hasattr(user, key):
                    raise ValueError(f'Unknown user field: {key}')
                setattr(user, key, value)

            await session.commit()
            await session.refresh(user)
            return user
