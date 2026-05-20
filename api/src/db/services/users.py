from sqlalchemy import select
from src.db.models import User
from src.db.session import get_session
from src.models.users import Accent, Radius, Theme


class UsersService:
    async def list(self) -> list[User]:
        '''Return all users in the database.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(User)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def create_or_update_oidc_user(
        self,
        *,
        oidc_subject: str,
        email: str,
        name: str,
        avatar: str | None,
    ) -> User:
        '''Create a new OIDC user or update an existing one.'''

        existing_user = await self.get(oidc_subject, by='oidc_subject')
        if existing_user is not None:
            return await self.update(
                existing_user.id,
                email=email,
                name=name,
                avatar=avatar,
                oidc_subject=oidc_subject,
            ) or existing_user

        user_by_email = await self.get(email, by='email')
        if user_by_email is not None:
            return await self.update(
                user_by_email.id,
                name=name,
                avatar=avatar,
                oidc_subject=oidc_subject,
            ) or user_by_email

        Session = await get_session()
        async with Session() as session:
            user = User(
                name=name,
                email=email,
                avatar=avatar,
                oidc_subject=oidc_subject,
            )

            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    async def get(self, param: int | str, *, by: str = 'id') -> User | None:
        '''Retrieve a user by id, email, or OIDC subject.'''

        Session = await get_session()
        async with Session() as session:
            if by == 'email':
                result = await session.execute(select(User).where(User.email == param))
            elif by == 'oidc_subject':
                result = await session.execute(select(User).where(User.oidc_subject == param))
            elif by == 'id':
                result = await session.execute(select(User).where(User.id == param))
            else:
                raise ValueError('Unknown lookup value for "by".')

            return result.scalars().first()

    async def update(
        self,
        user_id: int,
        **params: str | int | Theme | Accent | Radius | None,
    ) -> User | None:
        '''Update a user and return the updated record.'''

        Session = await get_session()
        async with Session() as session:
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
