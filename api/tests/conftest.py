import os
import json
import pytest
import pytest_asyncio
from base64 import b64encode
from pathlib import Path
from itsdangerous import TimestampSigner
from src.database import session
from collections.abc import AsyncIterator
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Seed the required settings before importing the FastAPI app.
os.environ.setdefault("SESSION_KEY", "1234")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")
os.environ.setdefault("OIDC_CLIENT_ID", "longlink-api")
os.environ.setdefault("OIDC_CLIENT_SECRET", "longlink-secret")
os.environ.setdefault("OIDC_ISSUER", "http://localhost:18080/realms/dev")
os.environ.setdefault("OIDC_REDIRECT_URI", "http://localhost:5173/auth/oidc")

from main import app
from src.enviroments import env
from src.database.models.users import User
from sqlmodel import SQLModel
from src.models.roles import PlatformRole

SESSION_COOKIE = "longlink_session"


@pytest_asyncio.fixture(autouse=True)
async def reset_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[None]:
    """Create a fresh SQLite database for each test."""

    db_url = f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setattr(env, 'DATABASE_URL', db_url)

    # Clear any cached session engine before binding the test database.
    session.Session = None
    session._engine = None

    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    session._engine = engine
    session.Session = async_sessionmaker(engine, expire_on_commit=False)

    try:
        yield
    finally:
        session.Session = None
        session._engine = None
        await engine.dispose()


def session_cookie(oidc: str) -> dict[str, str]:
    """Build a signed session cookie for the given OIDC subject."""

    payload = b64encode(json.dumps({"oidc": oidc}).encode("utf-8"))
    signed = TimestampSigner(str(env.SESSION_KEY)).sign(payload).decode("utf-8")
    return {SESSION_COOKIE: signed}


@pytest_asyncio.fixture
async def users() -> tuple[User, User, User]:
    """Create three persisted users for tests."""

    Session = await session.get_session()
    async with Session() as db_session:
        user1 = User(
            name='user1',
            email='user1@example.com',
            oidc='oidc-user-1',
            role=PlatformRole.administrator,
        )
        user2 = User(name='user2', email='user2@example.com', oidc='oidc-user-2')
        user3 = User(name='user3', email='user3@example.com', oidc='oidc-user-3')

        db_session.add_all([user1, user2, user3])
        await db_session.commit()

        await db_session.refresh(user1)
        await db_session.refresh(user2)
        await db_session.refresh(user3)

        return user1, user2, user3


@pytest.fixture
def clients(users: tuple[User, User, User]) -> tuple[TestClient, TestClient, TestClient]:
    """Build authenticated test clients for all seeded users."""

    user1, user2, user3 = users
    client1 = TestClient(app, cookies=session_cookie(str(user1.oidc)))
    client2 = TestClient(app, cookies=session_cookie(str(user2.oidc)))
    client3 = TestClient(app, cookies=session_cookie(str(user3.oidc)))
    return client1, client2, client3
