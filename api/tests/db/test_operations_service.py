from types import SimpleNamespace
from src.models.operations import OperationKind
from src.database.services.users import users
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


async def test_operations_service_tracks_successful_operation_lifecycle() -> None:
    """Track a scheduled operation through step advancement and completion."""

    # Arrange
    location = await db.locations.create("local", "Local testing")
    organization = await db.orgs.create("acme", location.id)
    app = await db.apps.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest")

    # Act
    operation = await db.operations.create(OperationKind.app_create, step="verify", app_id=app.id)
    claimed = await db.operations.claim(operation.id)
    completed = await db.operations.complete(operation.id)

    # Assert
    assert operation.status == "scheduled"
    assert claimed is not None
    assert claimed.status == "active"
    assert claimed.started_at is not None
    assert completed is not None
    assert completed.status == "completed"
    assert completed.stopped_at is not None
    assert completed.error is None


async def test_operations_service_tracks_failed_operation_lifecycle() -> None:
    """Track a scheduled operation through the failed state."""

    # Arrange
    location = await db.locations.create("local", "Local testing")
    organization = await db.orgs.create("acme", location.id)
    app = await db.apps.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest")

    # Act
    operation = await db.operations.create(OperationKind.app_create, step="verify", app_id=app.id)
    claimed = await db.operations.claim(operation.id)
    failed = await db.operations.fail(operation.id, "boom")

    # Assert
    assert operation.status == "scheduled"
    assert claimed is not None
    assert claimed.status == "active"
    assert failed is not None
    assert failed.status == "failed"
    assert failed.stopped_at is not None
    assert failed.error == "boom"


async def test_operations_service_defers_active_operation() -> None:
    """Defer an unfinished active operation back to scheduled."""

    # Arrange
    location = await db.locations.create("local", "Local testing")
    organization = await db.orgs.create("acme", location.id)
    app = await db.apps.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest")

    # Act
    operation = await db.operations.create(OperationKind.app_create, step="verify", app_id=app.id)
    claimed = await db.operations.claim(operation.id)
    deferred = await db.operations.defer(operation.id)

    # Assert
    assert operation.status == "scheduled"
    assert claimed is not None
    assert claimed.status == "active"
    assert deferred is not None
    assert deferred.status == "scheduled"
    assert deferred.started_at is None
    assert deferred.stopped_at is None


async def test_operations_service_resets_active_operations() -> None:
    """Reset interrupted active operations during startup."""

    # Arrange
    location = await db.locations.create("local", "Local testing")
    organization = await db.orgs.create("acme", location.id)
    app = await db.apps.create(organization.id, "dashboard", slug="dashboard", image="ghcr.io/longlink/dashboard:latest")
    operation = await db.operations.create(OperationKind.app_create, step="verify", app_id=app.id)
    await db.operations.claim(operation.id)

    # Act
    await db.operations.reset_active()

    # Assert
    reset = await db.operations.get(operation.id)
    assert reset is not None
    assert reset.status == "scheduled"
    assert reset.started_at is None
