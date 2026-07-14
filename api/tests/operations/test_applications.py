from types import SimpleNamespace
from src.utils.jobs import execute
from src.database.services import users, compute, database, locations, operations, applications, organizations
from src.models.operations import OperationKind
from src.models.applications import ApplicationStatus

db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    organizations=organizations,
    users=users,
)


def container_status(ready: bool = False, waiting_reason: str | None = None, terminated_exit_code: int | None = None) -> dict[str, object]:
    """Build a minimal Kubernetes container status double."""

    state: dict[str, object] = {}
    if waiting_reason is not None:
        state["waiting"] = {"reason": waiting_reason}

    if terminated_exit_code is not None:
        state["terminated"] = {"exitCode": terminated_exit_code}

    return {"ready": ready, "state": state}


def pod_status(phase: str, containers: list[dict[str, object]]) -> SimpleNamespace:
    """Build a minimal Kubernetes pod double."""

    return SimpleNamespace(raw={"status": {"phase": phase, "containerStatuses": containers}})


async def test_execute_application_verify_operation_completes_running_application(monkeypatch) -> None:
    """Complete an application.verify operation once the application is alive."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject",
        email="dev@longlink.dev",
        name="Dev User",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    operation = await db.operations.create(
        OperationKind.application_verify,
        application_id=application.id,
        user=user,
    )
    calls: list[str] = []

    async def fake_compute(location_id, include_deleted: bool = False):
        """Return a fake compute registry for startup verification."""

        assert not include_deleted
        return SimpleNamespace(kubeconfig="apiVersion: v1\nclusters: []\n", proxy_secret="proxy-secret")

    class FakeKubernetes:
        """Fake Kubernetes client for startup verification."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Accept the compute registry connection fields."""

            self.applications = self

        async def ready(self, application: str) -> bool:
            """Pretend the application is already ready."""

            calls.append("startup-check")
            return True

    monkeypatch.setattr(
        "src.operations.applications.compute.location",
        fake_compute,
    )
    monkeypatch.setattr(
        "src.operations.applications.Kubernetes",
        FakeKubernetes,
    )

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    assert calls == ["startup-check"]
    refreshed_application = await db.applications.get(application.id)
    assert refreshed_application is not None
    assert refreshed_application.status == ApplicationStatus.running
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "completed"
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_execute_application_verify_operation_marks_failed_when_dead(monkeypatch) -> None:
    """Fail an application.verify operation when the application crashes during startup."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject-existing",
        email="dev-existing@longlink.dev",
        name="Dev User Existing",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    operation = await db.operations.create(
        OperationKind.application_verify,
        application_id=application.id,
        user=user,
    )
    calls: list[str] = []

    async def fake_compute(location_id, include_deleted: bool = False):
        """Return a fake compute registry for startup verification."""

        assert not include_deleted
        return SimpleNamespace(kubeconfig="apiVersion: v1\nclusters: []\n", proxy_secret="proxy-secret")

    class FakeKubernetes:
        """Fake Kubernetes client for startup verification."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Accept the compute registry connection fields."""

            self.applications = self

        async def ready(self, application: str) -> bool:
            """Pretend the deployment is not ready yet."""

            return False

        async def pod(self, application: str) -> SimpleNamespace:
            """Return the current pod in a terminal startup state."""

            calls.append("startup-check")
            return pod_status("Pending", [container_status(waiting_reason="ImagePullBackOff")])

    monkeypatch.setattr(
        "src.operations.applications.compute.location",
        fake_compute,
    )
    monkeypatch.setattr(
        "src.operations.applications.Kubernetes",
        FakeKubernetes,
    )

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    assert calls == ["startup-check"]
    refreshed_application = await db.applications.get(application.id)
    assert refreshed_application is not None
    assert refreshed_application.status == ApplicationStatus.failed
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "failed"
    assert refreshed.started_at is not None
    assert refreshed.stopped_at is not None


async def test_execute_application_verify_operation_releases_when_only_pod_is_ready(monkeypatch) -> None:
    """Release application.verify until the current Deployment reports readiness."""

    # Arrange
    user = await db.users.upsert(
        oidc="dev-oidc-subject-waiting",
        email="dev-waiting@longlink.dev",
        name="Dev User Waiting",
        avatar=None,
    )
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )
    operation = await db.operations.create(
        OperationKind.application_verify,
        application_id=application.id,
        user=user,
    )

    async def fake_compute(location_id, include_deleted: bool = False):
        """Return a fake compute registry for startup verification."""

        assert not include_deleted
        return SimpleNamespace(kubeconfig="apiVersion: v1\nclusters: []\n", proxy_secret="proxy-secret")

    class FakeKubernetes:
        """Fake Kubernetes client for startup verification."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Accept the compute registry connection fields."""

            self.applications = self

        async def ready(self, application: str) -> bool:
            """Pretend the deployment is not ready yet."""

            return False

        async def pod(self, application: str) -> SimpleNamespace:
            """Return a ready pod before the Deployment status catches up."""

            return pod_status("Running", [container_status(ready=True)])

    monkeypatch.setattr(
        "src.operations.applications.compute.location",
        fake_compute,
    )
    monkeypatch.setattr(
        "src.operations.applications.Kubernetes",
        FakeKubernetes,
    )

    # Act
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    await execute(claimed)

    # Assert
    refreshed = await db.operations.get(operation.id)
    assert refreshed is not None
    assert refreshed.status == "scheduled"
    assert refreshed.started_at is None
    assert refreshed.stopped_at is None
