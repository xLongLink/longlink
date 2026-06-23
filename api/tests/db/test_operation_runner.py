from types import SimpleNamespace
from src.operations import execute
from src.models.compute import ComputeKind
from src.models.operations import OperationKind
from src.models.applications import AppStatus
from src.database.services.users import users
from src.operations.applications import AppStartupState
from src.database.services.compute import compute
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    locations=locations,
    operations=operations,
    organizations=organizations,
    users=users,
)


async def test_execute_app_create_operation_completes_running_app(monkeypatch) -> None:
    """Complete an app.create operation once the app is alive."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject",
        email="dev@longlink.dev",
        name="Dev User",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.app_create, application_id=application.id, step="verify", user=user)
    calls: list[str] = []

    async def fake_inspect_app_startup(operation) -> AppStartupState:
        """Pretend the app is already ready."""

        calls.append("startup-check")
        return AppStartupState.ready

    monkeypatch.setattr("src.operations.applications.inspect_app_startup", fake_inspect_app_startup)

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    assert calls == ["startup-check"]
    refreshed_application = await db.applications.get_by_id(application.id)
    assert refreshed_application is not None
    assert refreshed_application.status == AppStatus.running
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "completed"
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_execute_app_create_operation_marks_failed_when_dead(monkeypatch) -> None:
    """Fail an app.create operation when the app crashes during startup."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject-existing",
        email="dev-existing@longlink.dev",
        name="Dev User Existing",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.app_create, application_id=application.id, step="verify", user=user)
    calls: list[str] = []

    async def fake_inspect_app_startup(operation) -> AppStartupState:
        """Pretend the app has crashed."""

        calls.append("startup-check")
        return AppStartupState.dead

    monkeypatch.setattr("src.operations.applications.inspect_app_startup", fake_inspect_app_startup)

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    assert calls == ["startup-check"]
    refreshed_application = await db.applications.get_by_id(application.id)
    assert refreshed_application is not None
    assert refreshed_application.status == AppStatus.failed
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "failed"
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_execute_app_create_operation_releases_when_not_ready(monkeypatch) -> None:
    """Release app.create verification when the app is still starting."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject-waiting",
        email="dev-waiting@longlink.dev",
        name="Dev User Waiting",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.app_create, application_id=application.id, step="verify", user=user)

    async def fake_inspect_app_startup(operation) -> AppStartupState:
        """Pretend the app is still starting."""

        return AppStartupState.pending

    monkeypatch.setattr("src.operations.applications.inspect_app_startup", fake_inspect_app_startup)

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


async def test_execute_app_delete_operation_removes_runtime_and_deletes_app(monkeypatch) -> None:
    """Remove app runtime resources and soft-delete the app."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject-delete",
        email="dev-delete@longlink.dev",
        name="Dev User Delete",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user)
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
    operation = await db.operations.create(OperationKind.app_delete, application_id=application.id, step="remove_runtime", user=user)
    calls: list[dict[str, str]] = []

    class FakeCompute:
        """Fake compute adapter for app deletion."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            pass

        async def remove(self, organization: str, application: str) -> None:
            calls.append({"organization": organization, "application": application})

    monkeypatch.setattr("src.operations.applications.K8s", FakeCompute)

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    assert calls == [{"organization": "acme", "application": "dashboard"}]
    assert await db.applications.get(organization.id, "dashboard") is None
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "completed"
