from types import SimpleNamespace
from src.operations import execute
from src.models.computes import ComputeKind
from src.models.countries import Country
from src.models.databases import DatabaseKind
from src.models.operations import OperationKind
from src.models.applications import ApplicationStatus
from src.database.services.users import users
from src.operations.applications import ApplicationStartupState
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    organizations=organizations,
    users=users,
)


async def test_execute_application_create_operation_completes_running_application(monkeypatch) -> None:
    """Complete an application.create operation once the application is alive."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject",
        email="dev@longlink.dev",
        name="Dev User",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.application_create, application_id=application.id, step="verify", user=user)
    calls: list[str] = []

    async def fake_inspect_application_startup(operation) -> ApplicationStartupState:
        """Pretend the application is already ready."""

        calls.append("startup-check")
        return ApplicationStartupState.ready

    monkeypatch.setattr("src.operations.applications.inspect_application_startup", fake_inspect_application_startup)

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    assert calls == ["startup-check"]
    refreshed_application = await db.applications.get_by_id(application.id)
    assert refreshed_application is not None
    assert refreshed_application.status == ApplicationStatus.running
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "completed"
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_execute_application_create_operation_marks_failed_when_dead(monkeypatch) -> None:
    """Fail an application.create operation when the application crashes during startup."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject-existing",
        email="dev-existing@longlink.dev",
        name="Dev User Existing",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.application_create, application_id=application.id, step="verify", user=user)
    calls: list[str] = []

    async def fake_inspect_application_startup(operation) -> ApplicationStartupState:
        """Pretend the application has crashed."""

        calls.append("startup-check")
        return ApplicationStartupState.dead

    monkeypatch.setattr("src.operations.applications.inspect_application_startup", fake_inspect_application_startup)

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    assert calls == ["startup-check"]
    refreshed_application = await db.applications.get_by_id(application.id)
    assert refreshed_application is not None
    assert refreshed_application.status == ApplicationStatus.failed
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "failed"
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_execute_application_create_operation_releases_when_not_ready(monkeypatch) -> None:
    """Release application.create verification when the application is still starting."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject-waiting",
        email="dev-waiting@longlink.dev",
        name="Dev User Waiting",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.application_create, application_id=application.id, step="verify", user=user)

    async def fake_inspect_application_startup(operation) -> ApplicationStartupState:
        """Pretend the application is still starting."""

        return ApplicationStartupState.pending

    monkeypatch.setattr("src.operations.applications.inspect_application_startup", fake_inspect_application_startup)

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "scheduled"
    assert refreshed.step == "verify"
    assert refreshed.started_at is None
    assert refreshed.stopped_at is None


async def test_execute_application_delete_operation_removes_runtime_and_deletes_application(monkeypatch) -> None:
    """Remove application runtime resources and soft-delete the application."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject-delete",
        email="dev-delete@longlink.dev",
        name="Dev User Delete",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="local",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="localhost:8443",
        location_id=location.id,
        user=user,
    )
    await db.database.create(
        kind=DatabaseKind.postgresql,
        name="local",
        host="localhost",
        port=5432,
        username="longlink",
        password="secret",
        location_id=location.id,
        user=user,
    )
    operation = await db.operations.create(OperationKind.application_delete, application_id=application.id, step="remove_runtime", user=user)
    calls: list[dict[str, str]] = []

    class FakeCompute:
        """Fake compute adapter for application deletion."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            pass

        async def remove(self, organization: str, application: str) -> None:
            calls.append({"organization": organization, "application": application})

    class FakeDatabase:
        """Fake database adapter for application deletion."""

        def __init__(
            self,
            host: str,
            port: int,
            username: str,
            password: str,
            runtime_host: str | None = None,
            runtime_port: int | None = None,
        ) -> None:
            pass

        async def remove(self, organization: str, application: str) -> None:
            calls.append({"organization": organization, "application": application})

    monkeypatch.setattr("src.operations.provisioning.K8s", FakeCompute)
    monkeypatch.setattr("src.operations.provisioning.Postgres", FakeDatabase)

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    assert calls == [
        {"organization": "acme", "application": "dashboard"},
        {"organization": "acme", "application": "dashboard"},
    ]
    assert await db.applications.get(organization.id, "dashboard") is None
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "completed"
