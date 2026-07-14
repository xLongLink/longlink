import pytest
import asyncio
from uuid import UUID
from types import SimpleNamespace
from datetime import datetime
from src.utils import jobs as operation_worker
from src.operations import applications as application_operations
from src.operations import organizations as organization_operations
from src.utils.jobs import OperationOutcomeState
from src.models.users import UserSummary
from longlink.utils.time import utcnow
from src.models.statuses import ApplicationStatus
from src.models.locations import LocationProvider, LocationResponse
from src.models.operations import OperationKind
from src.models.organizations import OrganizationDetails
from src.database.models.users import User
from src.database.models.operations import Operation
from src.database.models.applications import Application

pytestmark = pytest.mark.no_db


class StopScheduler(RuntimeError):
    """Raised by test sleep calls to exit the infinite scheduler loop."""


def user() -> User:
    """Build one user for operation tests."""

    return User(
        id=UUID("11111111-1111-1111-1111-111111111111"),
        oidc="ops-user",
        email="ops@example.com",
        name="Ops User",
        avatar="",
    )


def location_response() -> LocationResponse:
    """Build one location response."""

    return LocationResponse(
        id=UUID("22222222-2222-2222-2222-222222222222"),
        name="Local",
        slug="local",
        country="CH",
        provider=LocationProvider.local,
    )


def organization_details(actor: User | None = None) -> OrganizationDetails:
    """Build one organization details payload."""

    owner = actor or user()
    location = location_response()
    return OrganizationDetails(
        id=UUID("33333333-3333-3333-3333-333333333333"),
        name="Acme",
        slug="acme",
        avatar="",
        country="CH",
        location=location,
        location_id=location.id,
        created_at=datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        updated_at=datetime.fromisoformat("2026-07-01T08:00:00+00:00"),
        created_by=UserSummary.model_validate(owner),
        updated_by=UserSummary.model_validate(owner),
        deleted_at=None,
        deleted_by=None,
        users=[],
        invitations=[],
        applications=[],
    )


def application_model() -> Application:
    """Build one application model."""

    return Application(
        id=UUID("44444444-4444-4444-4444-444444444444"),
        organization_id=organization_details().id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        status=ApplicationStatus.creating,
    )


def leased_operation(kind: OperationKind = OperationKind.application_verify) -> Operation:
    """Build one claimed operation."""

    return Operation(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        kind=kind,
        application_id=application_model().id if kind != OperationKind.organization_remove else None,
        organization_id=organization_details().id if kind == OperationKind.organization_remove else None,
        started_at=datetime.fromisoformat("2026-07-01T09:00:00+00:00"),
        lease_token="lease-token",
    )


async def test_operation_scheduler_claims_executes_and_renews(monkeypatch: pytest.MonkeyPatch) -> None:
    """Claim scheduled work, renew its lease during execution, and keep polling."""

    operation = leased_operation()
    completed = leased_operation()
    completed.stopped_at = utcnow()
    claims = [operation, None]
    executed: list[Operation] = []
    renewals: list[tuple[UUID, str]] = []
    real_sleep = asyncio.sleep

    async def fake_claim_next() -> Operation | None:
        """Return one operation and then no work."""

        return claims.pop(0)

    async def fake_execute(operation: Operation) -> Operation:
        """Record executed operations."""

        executed.append(operation)
        await real_sleep(0)
        return completed

    async def fake_renew_operation_lease(operation_id: UUID, lease_token: str) -> None:
        """Record heartbeat setup and wait until cancelled."""

        renewals.append((operation_id, lease_token))
        await real_sleep(3600)

    async def fake_sleep(seconds: float) -> None:
        """Stop the scheduler once it reaches the idle polling sleep."""

        raise StopScheduler()

    monkeypatch.setattr(operation_worker.operations, "claim_next", fake_claim_next)
    monkeypatch.setattr(operation_worker, "execute", fake_execute)
    monkeypatch.setattr(operation_worker, "renew_operation_lease", fake_renew_operation_lease)
    monkeypatch.setattr(operation_worker.asyncio, "sleep", fake_sleep)

    with pytest.raises(StopScheduler):
        await operation_worker.run_operation_scheduler()

    assert executed == [operation]
    assert renewals == [(operation.id, "lease-token")]


async def test_application_and_organization_remove_handlers_remove_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    """Execute remove cleanup handlers for applications and organizations."""

    application = application_model()
    organization = organization_details()
    compute_registry = SimpleNamespace(
        id=UUID("66666666-6666-6666-6666-666666666666"),
        kubeconfig="apiVersion: v1\nclusters: []\n",
        proxy_secret="proxy-secret",
    )
    removals: list[tuple[str, UUID | str]] = []

    async def fake_get_application(application_id: UUID, include_deleted: bool = False) -> Application:
        """Return a soft-deleted application for cleanup."""

        assert include_deleted
        return application

    async def fake_get_organization(organization_id: UUID, include_deleted: bool = False) -> OrganizationDetails:
        """Return an organization for cleanup."""

        assert include_deleted
        return organization

    async def fake_organization_applications(organization_id: UUID, include_deleted: bool = False) -> list[Application]:
        """Return soft-deleted applications for organization cleanup."""

        assert organization_id == organization.id
        assert include_deleted
        return [application]

    async def fake_compute(location_id: UUID, include_deleted: bool = False) -> SimpleNamespace:
        """Return the organization location compute registry."""

        assert location_id == organization.location_id
        return compute_registry

    async def fake_database(
        location_id: UUID,
        include_deleted: bool = False,
    ) -> None:
        """Return no database registry for organization cleanup."""

        assert location_id == organization.location_id
        assert include_deleted
        return None

    async def fake_storage(
        location_id: UUID,
        include_deleted: bool = False,
    ) -> None:
        """Return no storage registry for organization cleanup."""

        assert location_id == organization.location_id
        assert include_deleted
        return None

    class FakeKubernetes:
        """Record namespace deletion for organization cleanup."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Accept the compute registry connection fields."""

            assert kubeconfig == compute_registry.kubeconfig
            assert proxy_secret == compute_registry.proxy_secret
            self.applications = self

        async def delete_namespace(self, namespace: str) -> None:
            """Record namespace deletion."""

            removals.append(("namespace", namespace))

        async def delete(self, application_id: str) -> None:
            """Record application deletion."""

            removals.append(("application", UUID(application_id)))

    monkeypatch.setattr(application_operations.applications, "get", fake_get_application)
    monkeypatch.setattr(application_operations.organizations, "get", fake_get_organization)
    monkeypatch.setattr(organization_operations.organizations, "get", fake_get_organization)
    monkeypatch.setattr(organization_operations.organizations, "applications", fake_organization_applications)
    monkeypatch.setattr(application_operations.compute, "location", fake_compute)
    monkeypatch.setattr(organization_operations.compute, "location", fake_compute)
    monkeypatch.setattr(organization_operations.database, "location", fake_database)
    monkeypatch.setattr(organization_operations.storage, "location", fake_storage)
    monkeypatch.setattr(application_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(organization_operations, "Kubernetes", FakeKubernetes)

    app_operation = leased_operation(OperationKind.application_remove)
    org_operation = leased_operation(OperationKind.organization_remove)

    app_result = await application_operations.remove(app_operation)
    org_result = await organization_operations.remove(org_operation)

    assert app_result.state == OperationOutcomeState.complete
    assert org_result.state == OperationOutcomeState.complete
    assert removals == [
        ("application", application.id),
        ("application", application.id),
        ("namespace", organization.slug),
    ]
