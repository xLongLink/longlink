import pytest
from factories import claim_operation, create_application, create_organization, create_ready_infrastructure
from src.operations import applications as application_operations
from src.utils.jobs import execute
from src.database.session import session_scope
from src.database.services import operations, applications
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User


async def test_application_delete_failure_stops_before_provider_credential_cleanup(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Retain a tombstone when Kubernetes deletion fails before provider cleanup."""

    # Queue deletion for an Application with real persisted infrastructure assignments.
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    application = await create_application(organization, owner)
    async with session_scope() as session:
        await applications.soft_delete(session, application.id, owner)
        await session.commit()

    # Complete the setup Organization and Application creation operations before deletion.
    for expected_kind in (OperationKind.organization_create, OperationKind.application_create):
        setup_operation = await claim_operation()
        assert setup_operation is not None
        assert setup_operation.kind == expected_kind
        async with session_scope() as session:
            completed = await operations.complete(session, setup_operation.id)
            await session.commit()
        assert completed is not None

    claimed = await claim_operation()
    assert claimed is not None
    assert claimed.kind == OperationKind.application_delete
    assert claimed.target_id == application.id

    class FailingApplications:
        """Fail workload removal before the provider cleanup boundary."""

        async def delete(self, *_args: object) -> None:
            """Raise the Kubernetes deletion failure under test."""

            raise RuntimeError("Kubernetes workload deletion failed")

    class FailingKubernetes:
        """Expose the failing Application workload client."""

        def __init__(self, _kubeconfig: str) -> None:
            """Initialize the fake Kubernetes client."""

            self.applications = FailingApplications()

    def unexpected_provider(*_args: object) -> object:
        """Fail if provider cleanup runs before Kubernetes deletion completes."""

        raise AssertionError("provider cleanup ran before Kubernetes deletion completed")

    monkeypatch.setattr(application_operations, "Kubernetes", FailingKubernetes)
    monkeypatch.setattr(application_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(application_operations, "Exoscale", unexpected_provider)

    # Execute the real worker transition around the failing deletion handler.
    failed = await execute(claimed, application_operations.delete)

    # The failed operation retains its tombstone and never reaches provider cleanup.
    assert failed.status == OperationStatus.failed
    async with session_scope() as session:
        retained = await applications.get(session, application.id, include_deleted=True)
    assert retained is not None
    assert retained.deleted_at is not None
