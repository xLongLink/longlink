from types import SimpleNamespace
from datetime import UTC, datetime, timedelta
from src.operations import execute
from src.models.countries import Country
from src.models.operations import OperationKind
from src.models.applications import ApplicationStatus
from src.database.services import users
from src.operations.applications import (
    ApplicationStartupState,
    application_pods_startup_state,
)
from src.database.services import compute
from src.database.services import database
from src.database.services import locations
from src.database.services import operations
from src.database.services import applications
from src.database.services import organizations

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    organizations=organizations,
    users=users,
)


def container_status(
    ready: bool = False,
    waiting_reason: str | None = None,
    terminated_exit_code: int | None = None,
) -> SimpleNamespace:
    """Build a minimal Kubernetes container status double."""

    state = SimpleNamespace(waiting=None, terminated=None)
    if waiting_reason is not None:
        state.waiting = SimpleNamespace(reason=waiting_reason)

    if terminated_exit_code is not None:
        state.terminated = SimpleNamespace(exit_code=terminated_exit_code)

    return SimpleNamespace(ready=ready, state=state)


def pod_status(
    created_at: datetime,
    phase: str,
    containers: list[SimpleNamespace],
) -> SimpleNamespace:
    """Build a minimal Kubernetes pod double."""

    return SimpleNamespace(
        metadata=SimpleNamespace(creation_timestamp=created_at),
        status=SimpleNamespace(phase=phase, container_statuses=containers),
    )


def test_application_pods_startup_state_ignores_stale_dead_pods() -> None:
    """Keep a fresh rollout pending while old pods from a previous rollout are dead."""

    # Arrange
    operation_created_at = datetime(2026, 7, 1, 12, 0, tzinfo=UTC)
    stale_pod = pod_status(
        operation_created_at - timedelta(minutes=5),
        "Running",
        [container_status(waiting_reason="CrashLoopBackOff")],
    )
    current_pod = pod_status(
        operation_created_at + timedelta(seconds=2),
        "Pending",
        [container_status()],
    )

    # Act
    startup_state = application_pods_startup_state([stale_pod, current_pod], operation_created_at)

    # Assert
    assert startup_state == ApplicationStartupState.pending


def test_application_pods_startup_state_treats_image_pull_backoff_as_dead() -> None:
    """Fail verification when a current pod cannot pull its configured image."""

    # Arrange
    operation_created_at = datetime(2026, 7, 1, 12, 0, tzinfo=UTC)
    pod = pod_status(
        operation_created_at + timedelta(seconds=2),
        "Pending",
        [container_status(waiting_reason="ImagePullBackOff")],
    )

    # Act
    startup_state = application_pods_startup_state([pod], operation_created_at)

    # Assert
    assert startup_state == ApplicationStartupState.dead


def test_application_pods_startup_state_marks_current_crashloop_dead() -> None:
    """Fail verification when the current rollout pod is crashlooping."""

    # Arrange
    operation_created_at = datetime(2026, 7, 1, 12, 0, tzinfo=UTC)
    pod = pod_status(
        operation_created_at + timedelta(seconds=2),
        "Running",
        [container_status(waiting_reason="CrashLoopBackOff")],
    )

    # Act
    startup_state = application_pods_startup_state([pod], operation_created_at)

    # Assert
    assert startup_state == ApplicationStartupState.dead


async def test_execute_application_create_operation_completes_running_application(
    monkeypatch,
) -> None:
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
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    operation = await db.operations.create(
        OperationKind.application_create,
        application_id=application.id,
        step="verify",
        user=user,
    )
    calls: list[str] = []

    async def fake_inspect_application_startup(operation) -> ApplicationStartupState:
        """Pretend the application is already ready."""

        calls.append("startup-check")
        return ApplicationStartupState.ready

    monkeypatch.setattr(
        "src.operations.applications.inspect_application_startup",
        fake_inspect_application_startup,
    )

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


async def test_execute_application_create_operation_marks_failed_when_dead(
    monkeypatch,
) -> None:
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
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    operation = await db.operations.create(
        OperationKind.application_create,
        application_id=application.id,
        step="verify",
        user=user,
    )
    calls: list[str] = []

    async def fake_inspect_application_startup(operation) -> ApplicationStartupState:
        """Pretend the application has crashed."""

        calls.append("startup-check")
        return ApplicationStartupState.dead

    monkeypatch.setattr(
        "src.operations.applications.inspect_application_startup",
        fake_inspect_application_startup,
    )

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


async def test_execute_application_create_operation_releases_when_not_ready(
    monkeypatch,
) -> None:
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
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    operation = await db.operations.create(
        OperationKind.application_create,
        application_id=application.id,
        step="verify",
        user=user,
    )

    async def fake_inspect_application_startup(operation) -> ApplicationStartupState:
        """Pretend the application is still starting."""

        return ApplicationStartupState.pending

    monkeypatch.setattr(
        "src.operations.applications.inspect_application_startup",
        fake_inspect_application_startup,
    )

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
