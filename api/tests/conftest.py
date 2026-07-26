import os
import json
import base64
import pytest
import pytest_asyncio
from uuid import UUID
from httpx2 import Cookies, AsyncClient, ASGITransport
from pwdlib import PasswordHash
from pathlib import Path
from itsdangerous import TimestampSigner
from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Seed the required settings before importing the FastAPI app.
os.environ.setdefault("SESSION_KEY", "test-session-key-that-is-long-enough")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")

# Keep test client session cookies non-secure while letting adapters detect tests.
os.environ["DEVELOPMENT"] = "true"
os.environ["ENVIRONMENT"] = "testing"

from main import app
from sqlmodel import SQLModel
from src.utils import token
from src.database import session
from src.environments import env
from src.models.roles import PlatformRoles
from src.database.models.users import User, AccessToken

SESSION_COOKIE = "longlink_session"
TEST_PASSWORD = "longlink-test-password"


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


def session_cookie(accounts: list[UUID]) -> Cookies:
    """Build a signed session cookie for saved local accounts."""

    # Encode the same account_ids payload consumed by Starlette's session middleware.
    payload = base64.b64encode(json.dumps({"account_ids": [str(account) for account in accounts]}).encode("utf-8"))
    signed = TimestampSigner(str(env.SESSION_KEY)).sign(payload).decode("utf-8")
    cookies = Cookies()
    cookies.set(SESSION_COOKIE, signed, domain="testserver.local", path="/")
    return cookies


def authenticated_cookies(user_id: UUID, accounts: list[UUID] | None = None) -> Cookies:
    """Build matching authentication and saved-account cookies for one user."""

    # Mirror the login hook by retaining the active account in the saved list.
    saved_accounts = accounts[:] if accounts is not None else [user_id]
    if user_id not in saved_accounts:
        saved_accounts.append(user_id)
    cookies = session_cookie(saved_accounts)
    cookies.set("longlink_auth", str(user_id), domain="testserver.local", path="/")
    return cookies


@pytest.fixture(scope="session")
def password_hash() -> str:
    """Hash the shared fixture credential once for the test session."""

    return PasswordHash.recommended().hash(TEST_PASSWORD)


@pytest_asyncio.fixture
async def users(password_hash: str) -> tuple[User, User, User]:
    """Create three persisted users for tests."""

    # Persist independent users with the shared session-scoped credential.
    Session = await session.get_session()
    async with Session() as db_session:
        user1 = User(
            name="user1",
            email="user1@example.com",
            hashed_password=password_hash,
            role=PlatformRoles.administrator,
        )
        user2 = User(name="user2", email="user2@example.com", hashed_password=password_hash)
        user3 = User(name="user3", email="user3@example.com", hashed_password=password_hash, role=PlatformRoles.support)

        # Persist one matching database token for every authenticated fixture client.
        db_session.add_all([user1, user2, user3])
        db_session.add_all(
            [
                AccessToken(token=token.access_token_digest(str(user1.id)), user_id=user1.id),
                AccessToken(token=token.access_token_digest(str(user2.id)), user_id=user2.id),
                AccessToken(token=token.access_token_digest(str(user3.id)), user_id=user3.id),
            ]
        )
        await db_session.commit()
        return user1, user2, user3


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Build one unauthenticated API test client."""

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver", follow_redirects=True) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def clients(users: tuple[User, User, User]) -> AsyncIterator[tuple[AsyncClient, AsyncClient, AsyncClient]]:
    """Build authenticated test clients for all seeded users."""

    # Pair each database token with its auth cookie and signed account list.
    user1, user2, user3 = users
    async with (
        AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
            cookies=authenticated_cookies(user1.id),
            follow_redirects=True,
        ) as client1,
        AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
            cookies=authenticated_cookies(user2.id),
            follow_redirects=True,
        ) as client2,
        AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
            cookies=authenticated_cookies(user3.id),
            follow_redirects=True,
        ) as client3,
    ):
        yield client1, client2, client3
