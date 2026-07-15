import pytest
from types import SimpleNamespace
from fastapi import HTTPException
from factories import create_ready_location
from src.environments import env
from src.models.statuses import LocationStatus
from src.models.locations import LocationCreate
from src.database.services import compute, storage, database, locations, operations, organizations
from src.models.operations import OperationStatus
from src.database.models.users import User
from src.models.infrastructure import StorageKind, DatabaseKind, ComputeConfiguration, StorageConfiguration, DatabaseConfiguration

db = SimpleNamespace(
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
)

LOCATION_PAYLOAD = LocationCreate(
    name="Primary",
    country="CH",
    compute=ComputeConfiguration(kubeconfig="apiVersion: v1\nclusters: []\n"),
    database=DatabaseConfiguration(
        kind=DatabaseKind.postgresql,
        host="postgres.example",
        port=5432,
        username="longlink",
        password="secret",
    ),
    storage=StorageConfiguration(
        kind=StorageKind.minio,
        endpoint_url="https://minio.example",
        runtime_endpoint_url="https://minio.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
    ),
)


async def test_create_get_and_fetch_return_complete_location_aggregate(users: tuple[User, User, User]) -> None:
    """Persist a complete location aggregate and queue its reconciliation."""

    # Arrange
    owner = users[0]

    # Act
    location, operation = await db.locations.create("primary", LOCATION_PAYLOAD, owner)
    fetched = await db.locations.fetch()
    reloaded = await db.locations.get(location.id)
    compute_registry = await db.compute.location(location.id)
    database_registry = await db.database.location(location.id)
    storage_registry = await db.storage.location(location.id)
    open_operations = [item for item in await db.operations.fetch() if item.stopped_at is None]

    # Assert
    assert location.name == "Primary"
    assert location.slug == "primary"
    assert location.country == "CH"
    assert location.status == LocationStatus.provisioning
    assert location.version is None
    assert location.created_id == owner.id
    assert location.updated_id == owner.id
    assert [item.id for item in fetched] == [location.id]
    assert reloaded is not None
    assert reloaded.id == location.id
    assert compute_registry is not None
    assert compute_registry.slug == "primary-compute"
    assert compute_registry.kubeconfig == LOCATION_PAYLOAD.compute.kubeconfig
    assert database_registry is not None
    assert database_registry.slug == "primary-database"
    assert database_registry.host == LOCATION_PAYLOAD.database.host
    assert storage_registry is not None
    assert storage_registry.slug == "primary-storage"
    assert storage_registry.runtime_endpoint_url == LOCATION_PAYLOAD.storage.runtime_endpoint_url
    assert [item.id for item in open_operations] == [operation.id]
    assert operation.location_id == location.id
    assert operation.platform_version == env.VERSION
    assert operation.status == OperationStatus.scheduled


async def test_record_success_observes_complete_location_version(users: tuple[User, User, User]) -> None:
    """Record a successfully reconciled Platform version across the location aggregate."""

    # Arrange
    owner = users[0]
    location, operation = await db.locations.create("primary", LOCATION_PAYLOAD, owner)

    # Act
    observed = await db.locations.record_success(
        location.id,
        env.VERSION,
        "https://gateway.example",
        "gateway-ca",
        "gateway-certificate",
        "gateway-private-key",
    )
    reloaded = await db.locations.get(location.id)
    compute_registry = await db.compute.location(location.id)
    open_operations = [item for item in await db.operations.fetch() if item.stopped_at is None]

    # Assert
    assert observed is True
    assert reloaded is not None
    assert reloaded.status == LocationStatus.ready
    assert reloaded.version == env.VERSION
    assert compute_registry is not None
    assert compute_registry.gateway_url == "https://gateway.example"
    assert compute_registry.gateway_ca_certificate == "gateway-ca"
    assert compute_registry.gateway_tls_certificate == "gateway-certificate"
    assert compute_registry.gateway_tls_private_key == "gateway-private-key"
    assert [item.id for item in open_operations] == [operation.id]
    assert operation.platform_version == env.VERSION
    assert operation.status == OperationStatus.scheduled


async def test_delete_marks_location_for_reconciliation(users: tuple[User, User, User]) -> None:
    """Tombstone an unused location aggregate and queue its teardown."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner, slug="primary", name="Primary")

    # Act
    result = await db.locations.delete(location.id, owner)
    active = await db.locations.get(location.id)
    deleted = await db.locations.get(location.id, include_deleted=True)
    open_operations = [item for item in await db.operations.fetch() if item.stopped_at is None]

    # Assert
    assert result is not None
    changed, operation = result
    assert changed.status == LocationStatus.deleting
    assert changed.version is None
    assert changed.deleted_id == owner.id
    assert active is None
    assert deleted is not None
    assert deleted.id == location.id
    assert await db.locations.fetch() == []
    assert [item.id for item in open_operations] == [operation.id]
    assert operation.location_id == location.id
    assert operation.platform_version == env.VERSION
    assert operation.status == OperationStatus.scheduled


async def test_delete_rejects_location_used_by_active_organization(users: tuple[User, User, User]) -> None:
    """Reject location teardown while active organization state depends on it."""

    # Arrange
    owner = users[0]
    location = await create_ready_location(owner, slug="primary", name="Primary")
    await db.organizations.create("acme", "acme", location.id, owner)

    # Act
    with pytest.raises(HTTPException) as exc:
        await db.locations.delete(location.id, owner)

    # Assert
    assert exc.value.status_code == 409
    assert exc.value.detail == "Location is used by active organizations"
    reloaded = await db.locations.get(location.id)
    assert reloaded is not None
    assert reloaded.status == LocationStatus.ready
    assert reloaded.version == env.VERSION
    open_operations = [item for item in await db.operations.fetch() if item.stopped_at is None]
    assert len(open_operations) == 1
    assert open_operations[0].location_id == location.id
    assert open_operations[0].platform_version == env.VERSION
    assert open_operations[0].status == OperationStatus.scheduled
