from types import SimpleNamespace
from src.models.kinds import ComputeKind, DatabaseKind
from src.models.operations import OperationStatus
from src.operations import execute
from src.database.services.applications import apps
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.organizations import orgs
from src.database.services.storage import storage
from src.database.services.users import users

db = SimpleNamespace(
    apps=apps,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    orgs=orgs,
    storage=storage,
    users=users,
)


async def test_drain_scheduled_operations_executes_compute_setup(monkeypatch) -> None:
    """Resume an active compute setup operation during startup."""

    # Arrange
    location = await db.locations.create("local", "Local testing")
    registry = await db.compute.create(
        kind=ComputeKind.kubernetes,
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="localhost:8443",
        location_id=location.id,
    )
    operation = await db.operations.create("compute.setup", {"registry_id": registry.id})
    await db.operations.claim(operation.id)
    calls: list[str] = []

    class FakeCompute:
        """Fake compute adapter for the queue runner."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            calls.append("init")

        async def cleanup(self) -> None:
            calls.append("cleanup")

        async def setup(self) -> None:
            calls.append("setup")

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)

    # Act
    await execute()

    # Assert
    assert calls == ["init", "cleanup", "setup"]
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == OperationStatus.completed
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_drain_active_app_create_operation_resumes_from_database(monkeypatch) -> None:
    """Resume a crashed app.create operation without duplicating work."""

    # Arrange
    user = await db.users.upsert(
        oidc_subject="dev-oidc-subject",
        email="dev@longlink.dev",
        name="Dev User",
        avatar=None,
    )
    local_location = await db.locations.create("local", "Local testing")
    remote_location = await db.locations.create("remote", "Remote testing")
    await db.orgs.create("acme", remote_location.id, user)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.local.longlink.internal",
        location_id=local_location.id,
    )
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.remote.longlink.internal",
        location_id=remote_location.id,
    )
    await db.database.create(
        kind=DatabaseKind.postgre,
        name="local",
        host="db.local.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        sslmode="require",
        maintenance_database="postgres",
        location_id=local_location.id,
    )
    await db.database.create(
        kind=DatabaseKind.postgre,
        name="remote",
        host="db.remote.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        sslmode="require",
        maintenance_database="postgres",
        location_id=remote_location.id,
    )
    operation = await db.operations.create(
        "app.create",
        {
            "organization": "acme",
            "name": "dashboard",
            "image": "ghcr.io/longlink/dashboard:latest",
            "description": "Dashboard app",
            "icon": None,
            "envs": {"API_KEY": "secret-value"},
            "user_id": user.id,
        },
    )
    await db.operations.claim(operation.id)
    calls: list[str] = []

    class FakeCompute:
        """Fake compute adapter for resuming app creation."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            calls.append("init")

        async def namespace(self, organization: str) -> None:
            calls.append("namespace")

        async def application(
            self,
            organization: str,
            application: str,
            image: str,
            port: int,
            secrets: dict[str, str],
        ) -> None:
            calls.append("application")

    class FakeDatabase:
        """Fake database adapter for resuming app creation."""

        def __init__(self, host: str, port: int, username: str, password: str, sslmode: str | None, maintenance_database: str) -> None:
            calls.append("database")

        async def schema(self, organization: str, application: str) -> str:
            calls.append("schema")
            return "postgresql://fake"

    monkeypatch.setattr("src.routes.applications.K8s", FakeCompute)
    monkeypatch.setattr("src.routes.applications.Postgre", FakeDatabase)

    async def fake_app_is_ready(operation) -> bool:
        """Pretend the app endpoints are already available."""

        return True

    monkeypatch.setattr("src.operations._app_is_ready", fake_app_is_ready)

    # Act
    await execute()

    # Assert
    assert calls == ["init", "database", "namespace", "schema", "application"]
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == OperationStatus.completed
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_drain_active_app_create_operation_finishes_existing_app(monkeypatch) -> None:
    """Finish an already-persisted app.create operation without rebuilding it."""

    # Arrange
    user = await db.users.upsert(
        oidc_subject="dev-oidc-subject-existing",
        email="dev-existing@longlink.dev",
        name="Dev User Existing",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(
        "app.create",
        {
            "organization": "acme",
            "name": "dashboard",
            "image": "ghcr.io/longlink/dashboard:latest",
            "description": "Dashboard app",
            "icon": None,
            "envs": {},
            "user_id": user.id,
        },
    )
    await db.operations.claim(operation.id)
    calls: list[str] = []

    async def fake_app_is_ready(operation) -> bool:
        """Pretend the app endpoints are already available."""

        calls.append("ready-check")
        return True

    monkeypatch.setattr("src.operations._app_is_ready", fake_app_is_ready)

    # Act
    await execute()

    # Assert
    assert calls == ["ready-check"]
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == OperationStatus.completed
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None
