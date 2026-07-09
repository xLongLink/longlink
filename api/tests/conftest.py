import base64
import os
import json
import pytest
import pytest_asyncio
from pathlib import Path
from itsdangerous import TimestampSigner
from collections.abc import AsyncIterator
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Seed the required settings before importing the FastAPI app.
os.environ.setdefault("SESSION_KEY", "test-session-key-that-is-long-enough")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")
os.environ.setdefault("DATABASE_SSLMODE", "disable")

# Keep TestClient session cookies non-secure while letting adapters detect tests.
os.environ["DEVELOPMENT"] = "true"
os.environ["ENVIRONMENT"] = "testing"
os.environ.setdefault("OIDC_CLIENT_ID", "longlink-api")
os.environ.setdefault("OIDC_CLIENT_SECRET", "longlink-secret")
os.environ.setdefault("OIDC_ISSUER", "https://identity.example/realms/dev")
os.environ.setdefault("OIDC_REDIRECT_URI", "https://app.example/auth/oidc")

from main import app
from sqlmodel import SQLModel
from src.database import session
from src.environments import env
from src.models.roles import PlatformRoles
from src.database.models.users import User

SESSION_COOKIE = "longlink_session"


@pytest_asyncio.fixture(autouse=True)
async def reset_db(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    request: pytest.FixtureRequest,
) -> AsyncIterator[None]:
    """Create a fresh SQLite database for each test."""

    if request.node.get_closest_marker("no_db"):
        session.Session = None
        session._engine = None
        try:
            yield
        finally:
            session.Session = None
            session._engine = None
        return

    db_url = f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setattr(env, "DATABASE_URL", db_url)

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


def session_cookie(oidc: str, accounts: list[str] | None = None) -> dict[str, str]:
    """Build a signed session cookie for the given OIDC subject."""

    saved_accounts = accounts[:] if accounts is not None else [oidc]
    if oidc not in saved_accounts:
        saved_accounts.append(oidc)

    payload = base64.b64encode(json.dumps({"oidc": oidc, "oidc_accounts": saved_accounts}).encode("utf-8"))
    signed = TimestampSigner(str(env.SESSION_KEY)).sign(payload).decode("utf-8")
    return {SESSION_COOKIE: signed}


@pytest_asyncio.fixture
async def users() -> tuple[User, User, User]:
    """Create three persisted users for tests."""

    Session = await session.get_session()
    async with Session() as db_session:
        user1 = User(
            name="user1",
            email="user1@example.com",
            oidc="oidc-user-1",
            role=PlatformRoles.administrator,
        )
        user2 = User(name="user2", email="user2@example.com", oidc="oidc-user-2")
        user3 = User(name="user3", email="user3@example.com", oidc="oidc-user-3")

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
