from types import SimpleNamespace
from src.models.countries import Country
from src.models.operations import OperationKind
from src.environments import env
from src.database.services.users import users
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

db = SimpleNamespace(
    applications=applications,
    locations=locations,
    operations=operations,
    organizations=organizations,
    users=users,
)


async def test_operations_service_tracks_successful_operation_lifecycle() -> None:
    """Track a scheduled operation through step advancement and completion."""

    # Arrange
    user = await db.users.upsert(oidc="ops-oidc", email="ops@longlink.dev", name="Ops User", avatar="")
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)

    # Act
    operation = await db.operations.create(OperationKind.application_create, step="verify", application_id=application.id, user=user)
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
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)

    # Act
    operation = await db.operations.create(OperationKind.application_create, step="verify", application_id=application.id, user=user)
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
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)

    # Act
    operation = await db.operations.create(OperationKind.application_create, step="verify", application_id=application.id, user=user)
    claimed = await db.operations.claim(operation.id)
    assert claimed is not None
    assert claimed.lease_token is not None
    deferred = await db.operations.defer(operation.id, claimed.lease_token)

    # Assert
    assert operation.status == "scheduled"
    assert claimed.status == "active"
    assert deferred is not None
    assert deferred.status == "scheduled"
    assert deferred.started_at is None
    assert deferred.stopped_at is None


async def test_operations_service_resets_active_operations(monkeypatch) -> None:
    """Reset interrupted active operations during startup."""

    # Arrange
    monkeypatch.setattr(env, "OPERATION_LEASE_SECONDS", -1)
    user = await db.users.upsert(oidc="ops-oidc-4", email="ops4@longlink.dev", name="Ops User 4", avatar="")
    location = await db.locations.create("local", "Local testing", user, Country.CH)
    organization = await db.organizations.create("acme", location.id, user)
    application = await db.applications.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest", user=user)
    operation = await db.operations.create(OperationKind.application_create, step="verify", application_id=application.id, user=user)
    await db.operations.claim(operation.id)

    # Act
    await db.operations.reset_active()

    # Assert
    reset = await db.operations.get(operation.id)
    assert reset is not None
    assert reset.status == "scheduled"
    assert reset.started_at is None
