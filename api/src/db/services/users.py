from sqlalchemy import select
from src.db.models import User
from src.db.session import get_session


async def add_user(name: str, email: str, avatar: str, *, oauth_github_id: int | None) -> User:
    """Add a new user to the database and return the user ID."""
    
    # If the user already exists
    if oauth_github_id is not None:
        existing_user = await get_user_by_github_id(oauth_github_id)
        if existing_user is not None:
            return existing_user
    else:
        raise ValueError("An OAuth ID must be provided to create a user.")

    Session = await get_session()
    async with Session() as session:
        user = User(
            name=name,
            email=email,
            avatar=avatar,
            oauth_github_id=oauth_github_id
        )

        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def get_user_by_email(email: str) -> User | None:
    """Retrieve a user by their email address."""
    
    Session = await get_session()
    async with Session() as session:
        result = await session.execute(select(User).where(User.email == email))
        return result.scalars().first()
    

async def get_user_by_github_id(github_id: int) -> User | None:
    """Retrieve a user by their GitHub OAuth ID."""
    
    Session = await get_session()
    async with Session() as session:
        result = await session.execute(select(User).where(User.oauth_github_id == github_id))
        return result.scalars().first()


async def get_user_by_id(user_id: int) -> User | None:
    """Retrieve a user by their internal user ID."""
    
    Session = await get_session()
    async with Session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        return result.scalars().first()
    