import os
import yaml
import pytest
import shutil
import subprocess
import pytest_asyncio
from uuid import UUID, uuid4
from httpx2 import Cookies, Response, AsyncClient, ASGITransport
from pwdlib import PasswordHash
from typing import cast
from pathlib import Path
from contextlib import AsyncExitStack, asynccontextmanager
from sqlalchemy import create_engine
from kr8s.asyncio import Api
from collections.abc import AsyncIterator, AsyncGenerator
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

TEST_PASSWORD = "longlink-test-password"

pytest_plugins = ["containers"]

# Seed the required settings before importing the FastAPI app.
os.environ["SMTP_HOST"] = "smtp.example.com"
os.environ["PUBLIC_URL"] = "http://localhost:5173"
os.environ["SESSION_KEY"] = "test-session-key-that-is-long-enough"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./dev.db"
os.environ["ADMIN_EMAIL"] = "test-administrator@example.com"
os.environ["ADMIN_PASSWORD"] = TEST_PASSWORD
os.environ["ENCRYPTION_KEY"] = "longlink-test-encryption-key-that-is-long-enough"
os.environ["SMTP_PORT"] = "587"
os.environ["SMTP_TRANSPORT"] = "starttls"

# Prevent optional workstation credentials from changing test capabilities.
os.environ.pop("SMTP_PASSWORD", None)
os.environ.pop("SMTP_USERNAME", None)
os.environ.pop("GITHUB_OAUTH_CLIENT_ID", None)
os.environ.pop("GOOGLE_OAUTH_CLIENT_ID", None)
os.environ.pop("GITHUB_OAUTH_CLIENT_SECRET", None)
os.environ.pop("GOOGLE_OAUTH_CLIENT_SECRET", None)

from src.utils import mail, token
from src.database import models, session
from src.utils.s3 import Credentials
from src.kubernetes import storage
from src.kubernetes import databases as database_resources
from src.environments import env
from src.kubernetes.client import Kubernetes
from src.database.models.users import User


class StorageKubernetes:
    """Supply the external storage boundary for Platform lifecycle tests."""

    def __init__(self, compute: object, cluster: object) -> None:
        """Accept the bound Compute registry without opening connections."""

    @staticmethod
    async def controller_credentials(cluster: object) -> Credentials:
        """Return stable chart-managed credentials without cluster I/O."""

        return Credentials("controller", "controller-secret")

    async def verify(self) -> None:
        """Accept public S3 and private tunnel readiness verification."""

    async def apply(self, organization: UUID, *, quota_bytes: int) -> None:
        """Accept provisioning."""

    # Keep pure bucket naming identical to production while replacing external I/O.
    bucket_name = staticmethod(storage.Storage.bucket_name)

    async def service_account(self, organization: UUID, solution: UUID) -> Credentials:
        """Return stable scoped credentials."""

        return Credentials("solution", "generated-secret")

    async def delete_solution(self, organization: UUID, solution: UUID) -> None:
        """Accept revocation and private-object cleanup without storage I/O."""


class DatabaseKubernetes(Kubernetes):
    """Provide the CNPG provider boundary without opening Kubernetes connections."""

    async def forward_database(self, organization_id: UUID) -> int:
        """Supply a local transport port consumed only by the SQL fake."""

        return 15432


class DatabasePostgres:
    """Provide external SQL operations while activity uses real Platform state."""

    def __init__(self, *args: object, **kwargs: object) -> None:
        """Accept the private Organization connection settings."""

    @asynccontextmanager
    async def connection(self, database: str) -> AsyncGenerator["DatabasePostgres"]:
        """Scope readiness probes to their Organization database."""

        # Record the connection target forwarded by database coordination.
        self.database = database
        yield self

    async def execute(self, statement: object) -> None:
        """Accept only the readiness probe used by database coordination."""

        assert str(statement) == "SELECT 1"

    async def prepare_organization_database(self, organization: UUID) -> None:
        """Accept Organization database provisioning."""


@pytest.fixture(scope="session")
def rendered_chart() -> list[dict]:
    """Render the real Compute chart with fixed gateway and storage addresses."""

    # Render the production chart with the gateway test's infrastructure settings.
    chart = Path(__file__).resolve().parents[2] / "k8s/chart"
    release = subprocess.run(
        [
            "helm",
            "template",
            "longlink-compute",
            str(chart),
            "--namespace",
            "longlink-system",
            "--set",
            # Use documentation-only addresses in rendered integration manifests.
            "gateway.address=203.0.113.10",
            "--set",
            "storage.address=203.0.113.11",
            "--set",
            "gatewayAllowedSourceCidr=203.0.113.0/24",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    # Inspect the Helm-rendered resources, not a second copy of the chart logic.
    return list(yaml.safe_load_all(release.stdout))


@pytest.fixture
def database_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace only external CNPG and SQL I/O for request and lifecycle tests."""

    from src.operations import databases

    async def apply(
        client: object, organization: UUID, password: str, storage_class: str, *, size_mib: int = 100, instances: int = 1
    ) -> None:
        """Accept Organization cluster provisioning."""

    async def wait_ready(client: object, organization: UUID) -> None:
        """Accept database readiness verification."""

    async def certificate(client: object, organization: UUID) -> str:
        """Return a synthetic certificate consumed only by the SQL fake."""

        return "test-database-ca"

    monkeypatch.setattr(databases, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(database_resources, "apply", apply)
    monkeypatch.setattr(database_resources, "wait_ready", wait_ready)
    monkeypatch.setattr(database_resources, "certificate", certificate)
    monkeypatch.setattr(database_resources.postgres, "Postgres", DatabasePostgres)


UNTRUSTED_ORIGINS: list[str | None] = [None, "", "https://attacker.example"]
"""Untrusted browser origins rejected before mutation or verification."""


def untrusted_origin_headers(client: AsyncClient, origin: str | None) -> dict[str, str]:
    """Build request headers for one untrusted origin case."""

    # Remove the client's trusted default header for the missing-Origin case.
    if origin is None:
        client.headers.pop("origin")

    return {} if origin is None else {"origin": origin}


def assert_origin_rejected(response: Response) -> None:
    """Assert one response was rejected by CSRF protection before mutation."""

    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}


def reject_provider_construction(monkeypatch: pytest.MonkeyPatch, *targets: tuple[object, str]) -> None:
    """Fail any provider construction for absent lifecycle targets."""

    # Absent targets must return before opening external provider connections.
    def unexpected_provider(*_args: object) -> object:
        """Reject provider construction for an absent lifecycle target."""

        raise AssertionError("providers must not be constructed")

    for holder, name in targets:
        monkeypatch.setattr(holder, name, unexpected_provider)


class FakeKubernetes(Kubernetes):
    """Provide an opaque Kubernetes API client."""

    async def api(self) -> Api:
        """Return the fake API client used by resource fakes."""

        return cast(Api, object())


def kubernetes_client() -> Kubernetes:
    """Return a lazy Kubernetes client with an opaque external API boundary."""

    # Initialize the real lifecycle without opening a cluster connection.
    return FakeKubernetes({})


class RegistryKubernetes(Kubernetes):
    """Supply independent synthetic cluster identities without Kubernetes I/O."""

    async def cluster_uid(self) -> str:
        """Return an independent identity for each registered test cluster."""

        return str(uuid4())


async def verify_compute_gateway(_cluster: object, _url: str, _certificate: str | None, **_kwargs: object) -> None:
    """Accept inline Compute verification without external Kubernetes I/O."""


async def tls_certificate(_cluster: object, namespace: str, name: str) -> str:
    """Return the requested chart-managed TLS certificate without cluster I/O."""

    # Match the registered Secret coordinates for each infrastructure endpoint.
    return {("knative-serving", "longlink-gateway-tls"): "gateway-certificate", ("rustfs", "longlink-storage-tls"): "storage-certificate"}[
        namespace, name
    ]


async def database_storage_class(_cluster: object) -> str:
    """Return the StorageClass selected from the test Compute cluster."""

    return "local-path"


@pytest.fixture
def compute_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace external infrastructure discovery and verification for Compute registration."""

    # Keep provider replacements local to tests that explicitly register Compute infrastructure.
    monkeypatch.setattr("src.routes.v1.admin.computes.Kubernetes", RegistryKubernetes)
    monkeypatch.setattr("src.routes.v1.admin.computes.tls.certificate", tls_certificate)
    monkeypatch.setattr("src.routes.v1.admin.computes.gateway.verify", verify_compute_gateway)
    monkeypatch.setattr("src.routes.v1.admin.computes.storageclasses.resolve", database_storage_class)
    monkeypatch.setattr("src.routes.v1.admin.computes.Storage", StorageKubernetes)


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


@pytest.fixture(scope="session")
def database_template(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Build one closed, empty Platform schema for isolated per-test copies."""

    # Initialize metadata once without retaining connections to the template database.
    path = tmp_path_factory.mktemp("database") / "empty.db"
    engine = create_engine(f"sqlite:///{path}")
    try:
        models.metadata.create_all(engine)
    finally:
        engine.dispose()
    return path


@pytest_asyncio.fixture(autouse=True)
async def reset_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, request: pytest.FixtureRequest) -> AsyncIterator[None]:
    """Create a fresh SQLite database for each test."""

    if request.node.get_closest_marker("no_db"):
        yield
        return

    # Copy only for database-backed tests; never share mutable database files or sessions.
    template: Path = request.getfixturevalue("database_template")
    path = tmp_path / "test.db"
    shutil.copyfile(template, path)
    db_url = f"sqlite+aiosqlite:///{path}"
    monkeypatch.setattr(env, "DATABASE_URL", db_url)

    engine = create_async_engine(db_url)
    session.enable_sqlite_foreign_keys(engine)
    monkeypatch.setattr(session, "Session", async_sessionmaker(engine, expire_on_commit=False))

    try:

        # Keep shared test services bound for the complete test lifecycle.
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
    headers = {"origin": env.PUBLIC_URL}

    return AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver", cookies=cookies, headers=headers, follow_redirects=True
    )


@pytest.fixture(scope="session")
def password_hash() -> str:
    """Hash the shared fixture credential once for the test session."""

    return PasswordHash.recommended().hash(TEST_PASSWORD)


@pytest_asyncio.fixture
async def users(password_hash: str) -> tuple[User, User, User]:
    """Create one Platform administrator and two regular Platform users."""

    # Persist independent users with the shared session-scoped credential.
    session_factory = session.get_session()
    async with session_factory() as db_session:
        platform_administrator = User(
            name="Platform Administrator", email="platform-administrator@example.com", password=password_hash, administrator=True
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
