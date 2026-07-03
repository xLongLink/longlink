import main
import pytest
import asyncio
from uuid import UUID
from datetime import UTC, datetime
from src.routes import operations as operation_routes
from src.operations import execute
from src.operations import applications as application_operations
from src.models.users import UserSummary
from src.models.statuses import ApplicationStatus
from src.models.countries import Country
from src.models.locations import LocationProvider, LocationResponse
from src.models.operations import (OperationKind, OperationStatus,
                                   OperationResponse)
from src.operations.registry import operation_handler, get_operation_handler
from src.models.organizations import OrganizationDetails
from src.database.models.users import User
from src.database.models.operations import Operation
from src.database.models.applications import Application

pytestmark = pytest.mark.no_db


class FakeSessionScope:
    """Async context manager returning one fake operation session."""

    def __init__(self, session: object) -> None:
        """Store the fake session."""

        self.session = session

    async def __aenter__(self) -> object:
        """Return the configured session."""

        return self.session

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        """Exit without suppressing exceptions."""

        return False


class FakeRowcountResult:
    """Minimal SQLAlchemy update result."""

    def __init__(self, rowcount: int = 1) -> None:
        """Store the affected-row count."""

        self.rowcount = rowcount


class FakeScalarResult:
    """Minimal SQLAlchemy scalar result wrapper."""

    def __init__(self, value: object) -> None:
        """Store the scalar value."""

        self.value = value

    def first(self) -> object:
        """Return the first scalar value."""

        return self.value


class FakeSelectResult:
    """Minimal SQLAlchemy select result."""

    def __init__(self, value: object) -> None:
        """Store the selected value."""

        self.value = value

    def scalars(self) -> FakeScalarResult:
        """Return a scalar result wrapper."""

        return FakeScalarResult(self.value)

    def scalar_one_or_none(self) -> object:
        """Return the selected value."""

        return self.value


class FakeOperationSession:
    """Capture operation service statements without a database."""

    def __init__(self, operation: Operation, update_rowcount: int = 1) -> None:
        """Store the operation and configured update rowcount."""

        self.operation = operation
        self.update_rowcount = update_rowcount
        self.statements: list[object] = []
        self.commits = 0
        self.refreshes = 0

    async def execute(self, statement) -> FakeRowcountResult | FakeSelectResult:
        """Record statements and return update/select results."""

        self.statements.append(statement)
        if statement.is_update:
            return FakeRowcountResult(self.update_rowcount)

        return FakeSelectResult(self.operation)

    async def commit(self) -> None:
        """Record commits."""

        self.commits += 1

    async def refresh(self, operation: Operation) -> None:
        """Record refresh calls."""

        self.refreshes += 1


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
        country=Country.CH,
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


def leased_operation(kind: OperationKind = OperationKind.application_create, step: str = "verify") -> Operation:
    """Build one claimed operation."""

    return Operation(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        kind=kind,
        step=step,
        application_id=application_model().id if kind != OperationKind.organization_delete else None,
        organization_id=organization_details().id if kind == OperationKind.organization_delete else None,
        started_at=datetime.fromisoformat("2026-07-01T09:00:00+00:00"),
        lease_token="lease-token",
    )


def compiled_params(statement: object) -> dict[str, object]:
    """Return SQLAlchemy statement bind parameters."""

    return statement.compile().params


async def test_operation_records_and_listing_route(monkeypatch: pytest.MonkeyPatch) -> None:
    """Represent operation records and return them from the support listing route."""

    operation = Operation(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        kind=OperationKind.application_delete,
        step="remove",
        application_id=application_model().id,
        scheduled_at=datetime.fromisoformat("2026-07-01T10:00:00+00:00"),
        started_at=datetime.fromisoformat("2026-07-01T10:01:00+00:00"),
        stopped_at=datetime.fromisoformat("2026-07-01T10:02:00+00:00"),
    )

    async def fake_list() -> list[Operation]:
        """Return recorded operations newest first."""

        return [operation]

    monkeypatch.setattr(operation_routes.operations, "list", fake_list)

    assert operation.status == OperationStatus.completed
    assert OperationResponse.model_validate(operation).status == OperationStatus.completed
    assert await operation_routes.list_operations(user()) == [OperationResponse.model_validate(operation)]


async def test_operation_handler_registry_dispatches_custom_steps() -> None:
    """Register and execute one operation handler through the dispatcher."""

    kind = OperationKind.application_create
    step = "custom_step"

    @operation_handler(kind, step)
    async def fake_handler(operation: Operation) -> Operation:
        """Return the operation unchanged."""

        return operation

    operation = Operation(kind=kind, step=step, lease_token="lease-token")

    assert get_operation_handler(kind, step) is fake_handler
    assert await execute(operation) is operation


async def test_operation_claim_sets_lease_token_and_expiry(monkeypatch: pytest.MonkeyPatch) -> None:
    """Claiming an operation assigns a lease token and expiration."""

    operation = Operation(kind=OperationKind.application_create, step="verify")
    session = FakeOperationSession(operation)

    monkeypatch.setattr("src.database.services.operations.session_scope", lambda: FakeSessionScope(session))
    monkeypatch.setattr("src.database.services.operations.secrets.token_urlsafe", lambda length: "lease-token")
    monkeypatch.setattr("src.database.services.operations.env.OPERATION_LEASE_SECONDS", 60)

    claimed = await operation_routes.operations.claim(operation.id)

    assert claimed is operation
    assert operation.started_at is not None
    assert operation.lease_token == "lease-token"
    assert operation.lease_expires_at is not None
    assert operation.lease_expires_at > operation.started_at
    assert session.commits == 1
    assert session.refreshes == 1


async def test_operation_mutations_require_matching_lease_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    """Complete, fail, defer, and renew operations with lease-token predicates."""

    operation = leased_operation()
    method_calls = [
        ("complete", (operation.id, "lease-token")),
        ("fail", (operation.id, "boom", "lease-token")),
        ("defer", (operation.id, "lease-token")),
        ("renew_lease", (operation.id, "lease-token")),
    ]

    for method_name, args in method_calls:
        session = FakeOperationSession(operation)
        monkeypatch.setattr("src.database.services.operations.session_scope", lambda session=session: FakeSessionScope(session))

        result = await getattr(operation_routes.operations, method_name)(*args)
        statement = session.statements[0]
        params = compiled_params(statement)

        assert result is operation
        assert "lease-token" in params.values()
        assert operation.id in params.values()
        assert "operations.lease_token" in str(statement)
        assert session.commits == 1


async def test_operation_scheduler_claims_executes_and_renews(monkeypatch: pytest.MonkeyPatch) -> None:
    """Claim scheduled work, renew its lease during execution, and keep polling."""

    operation = leased_operation()
    completed = leased_operation()
    completed.stopped_at = datetime.now(UTC)
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

    monkeypatch.setattr(main.operations, "claim_next", fake_claim_next)
    monkeypatch.setattr(main, "execute", fake_execute)
    monkeypatch.setattr(main, "renew_operation_lease", fake_renew_operation_lease)
    monkeypatch.setattr(main.asyncio, "sleep", fake_sleep)

    with pytest.raises(StopScheduler):
        await main.run_operation_scheduler()

    assert executed == [operation]
    assert renewals == [(operation.id, "lease-token")]


async def test_application_and_organization_delete_handlers_remove_runtime(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Execute delete cleanup handlers for applications and organizations."""

    application = application_model()
    organization = organization_details()
    completed_operations: list[tuple[UUID, str]] = []
    removals: list[tuple[str, UUID]] = []

    async def fake_get_application(application_id: UUID, include_deleted: bool = False) -> Application:
        """Return a soft-deleted application for cleanup."""

        assert include_deleted
        return application

    async def fake_get_organization(organization_id: UUID, include_deleted: bool = False) -> OrganizationDetails:
        """Return an organization for cleanup."""

        assert include_deleted
        return organization

    async def fake_remove_application_runtime(application: Application, organization: OrganizationDetails) -> None:
        """Record application runtime removal."""

        removals.append(("application", application.id))

    async def fake_remove_organization_runtime(organization: OrganizationDetails) -> None:
        """Record organization runtime removal."""

        removals.append(("organization", organization.id))

    async def fake_complete(operation_id: UUID, lease_token: str) -> Operation:
        """Record completed cleanup operations."""

        completed_operations.append((operation_id, lease_token))
        completed = Operation(
            id=operation_id,
            kind=OperationKind.application_delete,
            step="remove",
            lease_token=lease_token,
            stopped_at=datetime.now(UTC),
        )
        return completed

    monkeypatch.setattr(application_operations.applications, "get_by_id", fake_get_application)
    monkeypatch.setattr(application_operations.organizations, "get", fake_get_organization)
    monkeypatch.setattr(application_operations.provisioning, "remove_application_runtime", fake_remove_application_runtime)
    monkeypatch.setattr(application_operations.provisioning, "remove_organization_runtime", fake_remove_organization_runtime)
    monkeypatch.setattr(application_operations.operations, "complete", fake_complete)

    app_operation = leased_operation(OperationKind.application_delete, "remove")
    org_operation = leased_operation(OperationKind.organization_delete, "remove")

    app_result = await application_operations.execute_application_delete(app_operation)
    org_result = await application_operations.execute_organization_delete(org_operation)

    assert app_result.status == OperationStatus.completed
    assert org_result.status == OperationStatus.completed
    assert removals == [
        ("application", application.id),
        ("organization", organization.id),
    ]
    assert completed_operations == [
        (app_operation.id, "lease-token"),
        (org_operation.id, "lease-token"),
    ]
