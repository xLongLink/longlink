import os
import pytest
import pytest_asyncio
from uuid import UUID
from httpx2 import Cookies, AsyncClient, ASGITransport
from pwdlib import PasswordHash
from pathlib import Path
from contextlib import AsyncExitStack
from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Seed the required settings before importing the FastAPI app.
os.environ.setdefault("SESSION_KEY", "test-session-key-that-is-long-enough")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./dev.db")

# Keep test client session cookies non-secure while letting adapters detect tests.
os.environ["DEVELOPMENT"] = "true"

from main import app
from sqlmodel import SQLModel
from src.utils import token
from src.database import session
from src.environments import env
from src.models.roles import PlatformRoles
from src.database.models.users import User, AccessToken

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


def authenticated_cookies(user_id: UUID) -> Cookies:
    """Build an authentication cookie for one user."""

    # Match the active browser credential used by authenticated API clients.
    cookies = Cookies()
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

    # Give every identity an isolated cookie jar while sharing the in-process application.
    async with AsyncExitStack() as stack:
        clients = [
            await stack.enter_async_context(
                AsyncClient(
                    transport=ASGITransport(app=app),
                    base_url="http://testserver",
                    cookies=authenticated_cookies(user.id),
                    follow_redirects=True,
                )
            )
            for user in users
        ]
        yield clients[0], clients[1], clients[2]
