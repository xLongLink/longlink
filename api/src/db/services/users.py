from sqlalchemy import select
from src.db.models import User
from src.db.session import get_session


class UsersService:
    async def list(self) -> list[User]:
        '''Return all users in the database.'''

        Session = await get_session()
        async with Session() as session:
            statement = select(User)
            result = await session.execute(statement)
            return list(result.scalars().all())

    async def create(
        self,
        name: str,
        email: str,
        avatar: str | None,
        *,
        oauth_github_id: int | None,
    ) -> User:
        """Add a new user to the database and return the user."""

        if oauth_github_id is not None:
            existing_user = await self.get(oauth_github_id, by='github')
            if existing_user is not None:
                return existing_user
        else:
            raise ValueError('An OAuth ID must be provided to create a user.')

        Session = await get_session()
        async with Session() as session:
            user = User(
                name=name,
                email=email,
                avatar=avatar,
                oauth_github_id=oauth_github_id,
            )

            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    async def get(self, param: int | str, *, by: str = 'id') -> User | None:
        """Retrieve a user by id, email, or GitHub OAuth ID."""

        Session = await get_session()
        async with Session() as session:
            if by == 'email':
                result = await session.execute(select(User).where(User.email == param))
            elif by == 'github':
                result = await session.execute(select(User).where(User.oauth_github_id == param))
            elif by == 'id':
                result = await session.execute(select(User).where(User.id == param))
            else:
                raise ValueError('Unknown lookup value for "by".')

            return result.scalars().first()

    async def update(self, user_id: int, **params: str | int | None) -> User | None:
        """Update a user and return the updated record."""

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
