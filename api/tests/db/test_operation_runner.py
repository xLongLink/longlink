from types import SimpleNamespace
from src.operations import execute
from src.models.operations import OperationKind
from src.models.applications import AppStatus
from src.database.services.users import users
from src.operations.applications import AppStartupState
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import apps
from src.database.services.organizations import orgs

db = SimpleNamespace(
    apps=apps,
    locations=locations,
    operations=operations,
    orgs=orgs,
    users=users,
)


async def test_execute_app_create_operation_completes_running_app(monkeypatch) -> None:
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
    operation = await db.operations.create(OperationKind.app_create, app_id=app_record.id, step="verify")
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
    refreshed_app = await db.apps.get_by_id(app_record.id)
    assert refreshed_app is not None
    assert refreshed_app.status == AppStatus.running
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "completed"
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_execute_app_create_operation_marks_failed_when_dead(monkeypatch) -> None:
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
    operation = await db.operations.create(OperationKind.app_create, app_id=app_record.id, step="verify")
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
    refreshed_app = await db.apps.get_by_id(app_record.id)
    assert refreshed_app is not None
    assert refreshed_app.status == AppStatus.failed
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "failed"
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_execute_app_create_operation_releases_when_not_ready(monkeypatch) -> None:
    """Release app.create verification when the app is still starting."""

    # Arrange
    user = await db.users.upsert(
        oidc_subject="dev-oidc-subject-waiting",
        email="dev-waiting@longlink.dev",
        name="Dev User Waiting",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing")
    await db.orgs.create("acme", location.id, user)
    app_record = await db.apps.create("acme", "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.app_create, app_id=app_record.id, step="verify")

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
