import os
import pytest
import pytest_asyncio
from uuid import UUID
from httpx2 import Cookies, AsyncClient, ASGITransport
from pwdlib import PasswordHash
from typing import cast
from pathlib import Path
from contextlib import AsyncExitStack, contextmanager, asynccontextmanager
from kr8s.asyncio import Api
from collections.abc import Iterator, AsyncIterator
from sqlalchemy.engine import URL
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

TEST_PASSWORD = "longlink-test-password"

# Seed the required settings before importing the FastAPI app.
os.environ["DEVELOPMENT"] = "true"
os.environ["PUBLIC_URL"] = "http://localhost:5173"
os.environ["SESSION_KEY"] = "test-session-key-that-is-long-enough"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./dev.db"
os.environ["ADMIN_NAME"] = "Test Administrator"
os.environ["ADMIN_EMAIL"] = "test-administrator@example.com"
os.environ["ADMIN_PASSWORD"] = TEST_PASSWORD
os.environ["ENCRYPTION_KEY"] = "longlink-test-encryption-key-that-is-long-enough"
os.environ["OPERATION_TIMEOUT_SECONDS"] = "600"
os.environ["AUTH_SESSION_LIFETIME_SECONDS"] = "2592000"
os.environ["SMTP_PORT"] = "587"
os.environ["SMTP_USE_TLS"] = "false"
os.environ["SMTP_START_TLS"] = "true"

# Prevent optional workstation credentials from changing test capabilities.
os.environ.pop("SMTP_HOST", None)
os.environ.pop("SMTP_PASSWORD", None)
os.environ.pop("SMTP_USERNAME", None)
os.environ.pop("GITHUB_OAUTH_CLIENT_ID", None)
os.environ.pop("GOOGLE_OAUTH_CLIENT_ID", None)
os.environ.pop("GITHUB_OAUTH_CLIENT_SECRET", None)
os.environ.pop("GOOGLE_OAUTH_CLIENT_SECRET", None)

from src.utils import mail, token
from src.database import session
from src.environments import env
from src.database.models import registry
from src.database.models.users import User


class DatabaseKubernetes:
    """Provide the CNPG provider boundary without opening Kubernetes connections."""

    def __init__(self, *_args: object) -> None:
        """Expose database operations through the production client shape."""

        self.databases = self

    async def apply(self, organization: UUID, password: str, storage_class: str, size_gib: int, instances: int) -> None:
        """Accept Organization cluster provisioning."""

    async def resume(self, organization: UUID) -> None:
        """Accept database resumption."""

    async def certificate(self, organization: UUID) -> str:
        """Return a synthetic certificate consumed only by the SQL fake."""

        return "test-database-ca"

    async def aclose(self) -> None:
        """Close the provider boundary."""


class DatabasePostgres:
    """Provide external SQL operations while activity and projection use real Platform state."""

    def __init__(self, *args: object, **kwargs: object) -> None:
        """Accept the private Organization connection settings."""

    @contextmanager
    def url(self, database: str, search_path: str | None = None) -> Iterator[URL]:
        """Build the structured connection target passed to shared projection."""

        yield URL.create("postgresql+psycopg", host="database.example", database=database)

    @asynccontextmanager
    async def _connection(self, database: str) -> AsyncIterator["DatabasePostgres"]:
        """Scope the SQL readiness probe to its Organization database."""

        yield self

    async def execute(self, statement: object) -> None:
        """Accept only the readiness probe used by database coordination."""

        assert str(statement) == "SELECT 1"

    async def prepare_organization_database(self, organization: UUID) -> None:
        """Accept shared schema provisioning."""

    async def database_usage(self, database: str) -> int | None:
        """Return deterministic database usage."""

        return 128


@pytest.fixture
def database_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace only external CNPG and SQL I/O for request and lifecycle tests."""

    from src.operations import databases
    from src.database.services import organizations

    async def sync(*args: object, **kwargs: object) -> None:
        """Accept the real shared-user snapshot at its database transport boundary."""

    monkeypatch.setattr(databases, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(databases, "Postgres", DatabasePostgres)
    monkeypatch.setattr(organizations.shared_audit, "sync", sync)


class FakeKubernetes:
    """Provide an opaque Kubernetes API client."""

    async def api(self) -> Api:
        """Return the fake API client used by resource fakes."""

        return cast(Api, object())


@pytest.fixture
def captured_mail(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str, str, str | None]]:
    """Capture outbound email without sending it through SMTP."""

    # Replace the mail transport at its external-system boundary.
    messages: list[tuple[str, str, str, str | None]] = []

    async def capture(recipient: str, subject: str, text: str, html: str | None = None) -> None:
        """Record one attempted email delivery."""

        messages.append((recipient, subject, text, html))

    monkeypatch.setattr(mail, "send_mail", capture)
    return messages


@pytest_asyncio.fixture(autouse=True)
async def reset_db(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    request: pytest.FixtureRequest,
) -> AsyncIterator[None]:
    """Create a fresh SQLite database for each test."""

    if request.node.get_closest_marker("no_db"):
        yield
        return

    db_url = f"sqlite+aiosqlite:///{tmp_path / 'test.db'}"
    monkeypatch.setattr(env, "DATABASE_URL", db_url)

    engine = create_async_engine(db_url)
    session.enable_sqlite_foreign_keys(engine)
    async with engine.begin() as conn:
        await conn.run_sync(registry.metadata.create_all)

    monkeypatch.setattr(session, "Session", async_sessionmaker(engine, expire_on_commit=False))

    try:
        yield
    finally:
        await engine.dispose()


def authenticated_cookies(user: User) -> Cookies:
    """Build browser authentication cookies for a persisted test user."""

    # Match the signed browser credential used by authenticated API clients.
    cookies = Cookies()
    cookies.set("longlink_auth", token.create_auth_token(user), domain="testserver.local", path="/")
    return cookies


def create_client(user: User | None = None) -> AsyncClient:
    """Build an in-process API client with optional authentication cookies."""

    # Unit and model tests do not need to import the composed API application.
    from main import app

    cookies = authenticated_cookies(user) if user is not None else None
    headers = {"origin": env.PUBLIC_URL.rstrip("/")}

    return AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
        cookies=cookies,
        headers=headers,
        follow_redirects=True,
    )


@pytest.fixture(scope="session")
def password_hash() -> str:
    """Hash the shared fixture credential once for the test session."""

    return PasswordHash.recommended().hash(TEST_PASSWORD)


@pytest_asyncio.fixture
async def users(password_hash: str) -> tuple[User, User, User]:
    """Create one Platform administrator and two regular Platform users."""

    # Persist independent users with the shared session-scoped credential.
    Session = session.get_session()
    async with Session() as db_session:
        platform_administrator = User(
            name="Platform Administrator",
            email="platform-administrator@example.com",
            password=password_hash,
            administrator=True,
        )
        regular_user = User(name="Regular User", email="regular-user@example.com", password=password_hash)
        other_user = User(name="Other User", email="other-user@example.com", password=password_hash)

        # Persist independent Platform users for authenticated fixture clients.
        db_session.add(platform_administrator)
        db_session.add(regular_user)
        db_session.add(other_user)
        await db_session.commit()
        return platform_administrator, regular_user, other_user


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """Build one unauthenticated API test client."""

    async with create_client() as test_client:
        yield test_client


@pytest_asyncio.fixture
async def clients(users: tuple[User, User, User]) -> AsyncIterator[tuple[AsyncClient, AsyncClient, AsyncClient]]:
    """Build authenticated clients for the Platform administrator and regular users."""

    # Give every identity an isolated cookie jar while sharing the in-process application.
    async with AsyncExitStack() as stack:
        clients = [await stack.enter_async_context(create_client(user)) for user in users]
        yield clients[0], clients[1], clients[2]
