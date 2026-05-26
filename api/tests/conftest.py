from base64 import b64encode
import json
from collections.abc import AsyncIterator
from pathlib import Path

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from itsdangerous import TimestampSigner
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from main import app
from src.db import session as db_session
from src.db.models import Base, User
from src.env import env

SESSION_COOKIE = "longlink_session"


@pytest_asyncio.fixture(autouse=True)
async def reset_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[None]:
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


def session_cookie(user_id: str) -> dict[str, str]:
    """Build a signed session cookie for the given user id."""

    payload = b64encode(json.dumps({"userid": user_id}).encode("utf-8"))
    signed = TimestampSigner(str(env.SESSION_KEY)).sign(payload).decode("utf-8")
    return {SESSION_COOKIE: signed}


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


@pytest.fixture
def clients(users: tuple[User, User, User]) -> tuple[TestClient, TestClient, TestClient]:
    """Build authenticated test clients for all seeded users."""

    user1, user2, user3 = users
    client1 = TestClient(app, cookies=session_cookie(str(user1.id)))
    client2 = TestClient(app, cookies=session_cookie(str(user2.id)))
    client3 = TestClient(app, cookies=session_cookie(str(user3.id)))
    return client1, client2, client3
