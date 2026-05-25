"""Shared pytest fixtures for API tests."""

from collections.abc import AsyncIterator

import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.db import session as db_session
from src.db.models import Base, User
from src.env import env


@pytest_asyncio.fixture(autouse=True)
async def reset_db(tmp_path, monkeypatch) -> AsyncIterator[None]:
    """Create a fresh SQLite database for each test."""

    db_url = f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setattr(env, 'DATABASE_URL', db_url)

    # Clear any cached session engine before binding the test database.
    db_session.Session = None
    db_session._engine = None

    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    db_session._engine = engine
    db_session.Session = async_sessionmaker(engine, expire_on_commit=False)

    try:
        yield
    finally:
        db_session.Session = None
        db_session._engine = None
        await engine.dispose()


@pytest_asyncio.fixture
async def users() -> tuple[User, User, User]:
    """Create three persisted users for tests."""

    Session = await db_session.get_session()
    async with Session() as session:
        user1 = User(name='user1', email='user1@example.com')
        user2 = User(name='user2', email='user2@example.com')
        user3 = User(name='user3', email='user3@example.com')

        session.add_all([user1, user2, user3])
        await session.commit()

        await session.refresh(user1)
        await session.refresh(user2)
        await session.refresh(user3)

        return user1, user2, user3
