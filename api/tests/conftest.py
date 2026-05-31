import json
import pytest
import pytest_asyncio
from main import app
from base64 import b64encode
from src.db import session as db_session
from pathlib import Path
from src.env import env
from itsdangerous import TimestampSigner
from src.db.models import Base, User
from collections.abc import AsyncIterator
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

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


def session_cookie(oidc_subject: str) -> dict[str, str]:
    """Build a signed session cookie for the given OIDC subject."""

    payload = b64encode(json.dumps({"oidc_subject": oidc_subject}).encode("utf-8"))
    signed = TimestampSigner(str(env.SESSION_KEY)).sign(payload).decode("utf-8")
    return {SESSION_COOKIE: signed}


@pytest_asyncio.fixture
async def users() -> tuple[User, User, User]:
    """Create three persisted users for tests."""

    Session = await db_session.get_session()
    async with Session() as session:
        user1 = User(name='user1', email='user1@example.com', oidc_subject='oidc-user-1', admin=True)
        user2 = User(name='user2', email='user2@example.com', oidc_subject='oidc-user-2')
        user3 = User(name='user3', email='user3@example.com', oidc_subject='oidc-user-3')

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
    client1 = TestClient(app, cookies=session_cookie(str(user1.oidc_subject)))
    client2 = TestClient(app, cookies=session_cookie(str(user2.oidc_subject)))
    client3 = TestClient(app, cookies=session_cookie(str(user3.oidc_subject)))
    return client1, client2, client3
