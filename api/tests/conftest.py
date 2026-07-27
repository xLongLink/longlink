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
    """Create one Platform administrator and two regular Platform users."""

    # Persist independent users with the shared session-scoped credential.
    Session = await session.get_session()
    async with Session() as db_session:
        platform_administrator = User(
            name="Platform Administrator",
            email="platform-administrator@example.com",
            hashed_password=password_hash,
            role=PlatformRoles.administrator,
        )
        regular_user = User(name="Regular User", email="regular-user@example.com", hashed_password=password_hash)
        other_user = User(name="Other User", email="other-user@example.com", hashed_password=password_hash)

        # Persist one matching database token for every authenticated fixture client.
        db_session.add_all([platform_administrator, regular_user, other_user])
        db_session.add_all(
            [
                AccessToken(token=token.access_token_digest(str(platform_administrator.id)), user_id=platform_administrator.id),
                AccessToken(token=token.access_token_digest(str(regular_user.id)), user_id=regular_user.id),
                AccessToken(token=token.access_token_digest(str(other_user.id)), user_id=other_user.id),
            ]
        )
        await db_session.commit()
        return platform_administrator, regular_user, other_user


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Build one unauthenticated API test client."""

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver", follow_redirects=True) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def clients(users: tuple[User, User, User]) -> AsyncIterator[tuple[AsyncClient, AsyncClient, AsyncClient]]:
    """Build authenticated clients for the Platform administrator and regular users."""

    # Pair each database token with its auth cookie and signed account list.
    platform_administrator, regular_user, other_user = users
    async with (
        AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
            cookies=authenticated_cookies(platform_administrator.id),
            follow_redirects=True,
        ) as administrator_client,
        AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
            cookies=authenticated_cookies(regular_user.id),
            follow_redirects=True,
        ) as regular_user_client,
        AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://testserver",
            cookies=authenticated_cookies(other_user.id),
            follow_redirects=True,
        ) as other_user_client,
    ):
        yield administrator_client, regular_user_client, other_user_client
