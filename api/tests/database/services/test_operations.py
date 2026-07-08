from types import SimpleNamespace
from datetime import UTC, datetime, timedelta
from src.environments import env
from src.models.operations import OperationKind
from src.database.session import get_session
from src.database.models.operations import Operation
from src.database.services import users
from src.database.services import locations
from src.database.services import operations
from src.database.services import applications
from src.database.services import organizations

db = SimpleNamespace(
    applications=applications,
    locations=locations,
    operations=operations,
    organizations=organizations,
    users=users,
)


async def test_operations_service_fetch_all_returns_newest_operations_first(users) -> None:
    """Return operations ordered by creation time descending."""

    # Arrange
    owner = users[0]
    older_operation = await db.operations.create(OperationKind.organization_delete, step="remove", user=owner)
    newer_operation = await db.operations.create(OperationKind.application_delete, step="remove", user=owner)

    Session = await get_session()
    async with Session() as session:
        older_row = await session.get(Operation, older_operation.id)
        newer_row = await session.get(Operation, newer_operation.id)
        assert older_row is not None
        assert newer_row is not None
        older_row.created_at = datetime.now(UTC) - timedelta(days=1)
        newer_row.created_at = datetime.now(UTC)
        await session.commit()

    # Act
    fetched = await db.operations.fetch_all()
    reloaded = await db.operations.get(older_operation.id)

    # Assert
    assert [operation.id for operation in fetched] == [newer_operation.id, older_operation.id]
    assert reloaded is not None
    assert reloaded.id == older_operation.id


async def test_operations_service_claim_next_claims_oldest_available_operation(users) -> None:
    """Claim the oldest available scheduled operation first."""

    # Arrange
    owner = users[0]
    older_operation = await db.operations.create(OperationKind.organization_delete, step="remove", user=owner)
    newer_operation = await db.operations.create(OperationKind.application_delete, step="remove", user=owner)

    Session = await get_session()
    async with Session() as session:
        older_row = await session.get(Operation, older_operation.id)
        newer_row = await session.get(Operation, newer_operation.id)
        assert older_row is not None
        assert newer_row is not None
        older_row.created_at = datetime.now(UTC) - timedelta(days=1)
        newer_row.created_at = datetime.now(UTC)
        await session.commit()

    # Act
    claimed = await db.operations.claim_next()

    # Assert
    assert claimed is not None
    assert claimed.id == older_operation.id
    assert claimed.status == "active"
    assert claimed.lease_token is not None


async def test_operations_service_claim_ignores_future_active_and_stopped_operations(users) -> None:
    """Claim only operations that are due, not already leased, and not stopped."""

    # Arrange
    owner = users[0]
    future_operation = await db.operations.create(
        OperationKind.application_delete,
        scheduled_at=datetime.now(UTC) + timedelta(days=1),
        step="remove",
        user=owner,
    )
    active_operation = await db.operations.create(OperationKind.organization_delete, step="remove", user=owner)
    claimed_operation = await db.operations.claim(active_operation.id)
    assert claimed_operation is not None
    assert claimed_operation.lease_token is not None

    # Act
    future_claim = await db.operations.claim(future_operation.id)
    active_claim = await db.operations.claim(active_operation.id)
    await db.operations.complete(active_operation.id, claimed_operation.lease_token)
    stopped_claim = await db.operations.claim(active_operation.id)

    # Assert
    assert future_claim is None
    assert active_claim is None
    assert stopped_claim is None


async def test_operations_service_lease_updates_require_matching_token(users) -> None:
    """Require the current lease token for lease mutation services."""

    # Arrange
    owner = users[0]
    operation = await db.operations.create(OperationKind.organization_delete, step="remove", user=owner)
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    assert claimed.lease_token is not None
    assert claimed.lease_expires_at is not None

    # Act
    wrong_renewal = await db.operations.renew_lease(operation.id, "wrong-token")
    wrong_defer = await db.operations.defer(operation.id, "wrong-token")
    wrong_completion = await db.operations.complete(operation.id, "wrong-token")
    wrong_failure = await db.operations.fail(operation.id, "boom", "wrong-token")
    renewed = await db.operations.renew_lease(operation.id, claimed.lease_token)

    # Assert
    assert wrong_renewal is None
    assert wrong_defer is None
    assert wrong_completion is None
    assert wrong_failure is None
    assert renewed is not None
    assert renewed.lease_expires_at is not None
    assert renewed.lease_expires_at >= claimed.lease_expires_at


async def test_operations_service_tracks_successful_operation_lifecycle() -> None:
    """Track a scheduled operation through step advancement and completion."""

    # Arrange
    user = await db.users.upsert(oidc="ops-oidc", email="ops@longlink.dev", name="Ops User", avatar="")
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )

    # Act
    operation = await db.operations.create(
        OperationKind.application_create,
        step="verify",
        application_id=application.id,
        user=user,
    )
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    assert claimed.lease_token is not None
    completed = await db.operations.complete(operation.id, claimed.lease_token)

    # Assert
    assert operation.status == "scheduled"
    assert claimed.status == "active"
    assert claimed.started_at is not None
    assert completed is not None
    assert completed.status == "completed"
    assert completed.stopped_at is not None
    assert completed.error is None


async def test_operations_service_tracks_failed_operation_lifecycle() -> None:
    """Track a scheduled operation through the failed state."""

    # Arrange
    user = await db.users.upsert(oidc="ops-oidc-2", email="ops2@longlink.dev", name="Ops User 2", avatar="")
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )

    # Act
    operation = await db.operations.create(
        OperationKind.application_create,
        step="verify",
        application_id=application.id,
        user=user,
    )
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    assert claimed.lease_token is not None
    failed = await db.operations.fail(operation.id, "boom", claimed.lease_token)

    # Assert
    assert operation.status == "scheduled"
    assert claimed.status == "active"
    assert failed is not None
    assert failed.status == "failed"
    assert failed.stopped_at is not None
    assert failed.error == "boom"


async def test_operations_service_defers_active_operation() -> None:
    """Defer an unfinished active operation back to scheduled."""

    # Arrange
    user = await db.users.upsert(oidc="ops-oidc-3", email="ops3@longlink.dev", name="Ops User 3", avatar="")
    location = await db.locations.create("local", "Local testing", user, "CH")
    organization = await db.organizations.create("acme", "acme", location.id, user)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=user,
    )

    # Act
    operation = await db.operations.create(
        OperationKind.application_create,
        step="verify",
        application_id=application.id,
        user=user,
    )
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    assert claimed.lease_token is not None
    deferred = await db.operations.defer(operation.id, claimed.lease_token)

    # Assert
    assert operation.status == "scheduled"
    assert claimed.status == "active"
    assert deferred is not None
    assert deferred.status == "scheduled"
    assert deferred.scheduled_at is not None
    assert deferred.scheduled_at > claimed.started_at
    assert deferred.started_at is None
    assert deferred.stopped_at is None


async def test_operations_service_skips_future_scheduled_operations() -> None:
    """Leave future scheduled operations unclaimed until their scheduled time."""

    # Arrange
    user = await db.users.upsert(
        oidc="ops-oidc-future",
        email="opsfuture@longlink.dev",
        name="Ops Future",
        avatar="",
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
        OperationKind.application_delete,
        application_id=application.id,
        scheduled_at=datetime.now(UTC) + timedelta(days=7),
        step="remove",
        user=user,
    )

    # Act
    claimed = await db.operations.claim_next()

    # Assert
    assert operation.status == "scheduled"
    assert claimed is None


async def test_operations_service_resets_active_operations(monkeypatch) -> None:
    """Reset interrupted active operations during startup."""

    # Arrange
    monkeypatch.setattr(env, "OPERATION_LEASE_SECONDS", -1)
    user = await db.users.upsert(oidc="ops-oidc-4", email="ops4@longlink.dev", name="Ops User 4", avatar="")
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
        OperationKind.application_create,
        step="verify",
        application_id=application.id,
        user=user,
    )
    await db.operations.claim(operation.id)

    # Act
    await db.operations.reset_active()

    # Assert
    reset = await db.operations.get(operation.id)
    assert reset is not None
    assert reset.status == "scheduled"
    assert reset.started_at is None


async def test_operations_service_reset_active_keeps_unexpired_leases(monkeypatch, users) -> None:
    """Keep active operations with healthy leases assigned."""

    # Arrange
    monkeypatch.setattr(env, "OPERATION_LEASE_SECONDS", 60)
    owner = users[0]
    operation = await db.operations.create(OperationKind.organization_delete, step="remove", user=owner)
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    assert claimed.lease_token is not None

    # Act
    await db.operations.reset_active()

    # Assert
    active = await db.operations.get(operation.id)
    assert active is not None
    assert active.status == "active"
    assert active.started_at is not None
    assert active.lease_token == claimed.lease_token
