from main import app
from types import SimpleNamespace
from src.models.kinds import ComputeKind, DatabaseKind
from fastapi.testclient import TestClient
from src.models.operations import OperationStatus
from src.models.applications import AppStatus
from src.database.services.users import users
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import apps
from src.database.services.organizations import orgs

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
    operation = await db.operations.create("compute.setup", registry_id=registry.id)
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

    monkeypatch.setattr("src.adapters.compute.K8s", FakeCompute)

    # Act
    with TestClient(app):
        pass

    # Assert
    assert calls == ["init", "cleanup", "setup"]
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == OperationStatus.completed
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_drain_active_app_create_operation_completes_running_app(monkeypatch) -> None:
    """Complete an app.create operation once the app is alive."""

    # Arrange
    user = await db.users.upsert(
        oidc_subject="dev-oidc-subject",
        email="dev@longlink.dev",
        name="Dev User",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    app_record = await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create("app.create", app_id=app_record.id)
    await db.operations.claim(operation.id)
    calls: list[str] = []

    async def fake_app_is_ready(operation) -> bool:
        """Pretend the app is already ready."""

        calls.append("ready-check")
        return True

    monkeypatch.setattr("src.operations.app_is_ready", fake_app_is_ready)

    # Act
    with TestClient(app):
        pass

    # Assert
    assert calls == ["ready-check"]
    refreshed_app = await db.apps.get_by_id(app_record.id)
    assert refreshed_app is not None
    assert refreshed_app.status == AppStatus.running
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == OperationStatus.completed
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_drain_active_app_create_operation_marks_failed_when_dead(monkeypatch) -> None:
    """Fail an app.create operation when the app crashes during startup."""

    # Arrange
    user = await db.users.upsert(
        oidc_subject="dev-oidc-subject-existing",
        email="dev-existing@longlink.dev",
        name="Dev User Existing",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    app_record = await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create("app.create", app_id=app_record.id)
    await db.operations.claim(operation.id)
    calls: list[str] = []

    async def fake_app_is_ready(operation) -> bool:
        """Pretend the app never becomes ready."""

        calls.append("ready-check")
        return False

    async def fake_app_is_dead(operation) -> bool:
        """Pretend the app has crashed."""

        calls.append("dead-check")
        return True

    monkeypatch.setattr("src.operations.app_is_ready", fake_app_is_ready)
    monkeypatch.setattr("src.operations.app_is_dead", fake_app_is_dead)

    # Act
    with TestClient(app):
        pass

    # Assert
    assert calls == ["ready-check", "dead-check"]
    refreshed_app = await db.apps.get_by_id(app_record.id)
    assert refreshed_app is not None
    assert refreshed_app.status == AppStatus.failed
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == OperationStatus.failed
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None
