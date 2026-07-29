import pytest
from uuid import UUID
from factories import create_ready_infrastructure
from src.operations import applications as application_operations
from src.utils.jobs import execute
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import operations, applications
from src.models.operations import OperationKind, OperationStatus
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_running_application() -> tuple[Application, UUID, str]:
    """Persist one running Application with complete immutable infrastructure assignments."""

    # Arrange the Application's ready Organization and compute registry.
    infrastructure = await create_ready_infrastructure()
    organization = Organization(
        name="Acme",
        slug="acme",
        compute_id=infrastructure.compute.id,
        database_id=infrastructure.database.id,
        storage_id=infrastructure.storage.id,
        status=Status.running,
    )
    application = Application(
        organization_id=organization.id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard@sha256:resolved",
        status=Status.running,
    )
    async with session_scope() as session:
        session.add_all([organization, application])
        await session.commit()
    return application, infrastructure.compute.id, infrastructure.compute.kubeconfig


async def test_application_reconcile_reapplies_running_workload(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply one running Application workload without reconciling shared gateway state."""

    # Arrange
    application, compute_id, kubeconfig = await create_running_application()
    applied: list[tuple[UUID, str, str]] = []

    class FakeApplications:
        """Capture Application workload reconciliation."""

        async def apply(self, application_id: UUID, namespace: str, image: str) -> None:
            """Record one desired workload apply call."""

            applied.append((application_id, namespace, image))

    class FakeKubernetes:
        """Expose only the Application workload boundary used by reconciliation."""

        def __init__(self, received_kubeconfig: str) -> None:
            """Validate the assigned compute target."""

            assert received_kubeconfig == kubeconfig
            self.applications = FakeApplications()

    monkeypatch.setattr(application_operations, "Kubernetes", FakeKubernetes)
    await operations.enqueue(compute_id, kind=OperationKind.application_reconcile, target_id=application.id)

    # Act
    claimed = await operations.claim_next()
    assert claimed is not None
    completed = await execute(claimed, application_operations.create)

    # Assert
    assert completed.status == OperationStatus.completed
    assert applied == [(application.id, "acme", application.image)]
    refreshed = await applications.get(application.id)
    assert refreshed is not None
    assert refreshed.status == Status.running


async def test_application_reconcile_failure_preserves_running_status(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep a live Application running when its release workload apply fails."""

    # Arrange
    application, compute_id, kubeconfig = await create_running_application()

    class FailingApplications:
        """Fail the Application workload boundary."""

        async def apply(self, application_id: UUID, namespace: str, image: str) -> None:
            """Raise the provider failure after validating the requested workload."""

            assert (application_id, namespace, image) == (application.id, "acme", application.image)
            raise RuntimeError("Kubernetes rollout failed")

    class FailingKubernetes:
        """Expose a failing Application workload boundary."""

        def __init__(self, received_kubeconfig: str) -> None:
            """Validate the assigned compute target."""

            assert received_kubeconfig == kubeconfig
            self.applications = FailingApplications()

    monkeypatch.setattr(application_operations, "Kubernetes", FailingKubernetes)
    await operations.enqueue(compute_id, kind=OperationKind.application_reconcile, target_id=application.id)

    # Act
    claimed = await operations.claim_next()
    assert claimed is not None
    failed = await execute(claimed, application_operations.create)

    # Assert
    assert failed.status == OperationStatus.failed
    refreshed = await applications.get(application.id)
    assert refreshed is not None
    assert refreshed.status == Status.running
