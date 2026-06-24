from types import SimpleNamespace

from src.models.computes import ComputeKind
from src.models.countries import Country
from src.models.databases import DatabaseKind
from src.models.operations import OperationKind
from src.models.roles import OrganizationRoles
from src.models.storages import StorageKind
from src.database.services.applications import applications
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.operations import operations
from src.database.services.organizations import organizations
from src.database.services.storage import storage
from src.database.services.users import users


db = SimpleNamespace(
    applications=applications,
    compute=compute,
    database=database,
    locations=locations,
    operations=operations,
    organizations=organizations,
    storage=storage,
    users=users,
)


async def test_users_and_organizations_services_create_membership_profile_and_delete(users: tuple) -> None:
    """Create an organization, expose it in the profile, and delete it cleanly."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)

    # Act
    organization = await db.organizations.create("acme", location.id, owner)
    profile = await db.users.profile(owner.id)
    deleted = await db.organizations.delete(organization.id, deleted_id=owner.id)

    # Assert
    assert profile is not None
    assert profile.organizations[0].id == organization.id
    assert profile.organizations[0].role == OrganizationRoles.owner
    assert deleted is not None
    assert deleted.deleted_at is not None
    assert await db.organizations.get(organization.id) is None


async def test_locations_service_creates_lists_and_deletes_location(users: tuple) -> None:
    """Create a location, list it, and remove it from future reads."""

    # Arrange
    owner = users[0]

    # Act
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    listed = await db.locations.list()
    deleted = await db.locations.delete(location.id, deleted_id=owner.id)

    # Assert
    assert any(item.id == location.id for item in listed)
    assert deleted is not None
    assert deleted.deleted_at is not None
    assert await db.locations.get(location.id) is None


async def test_applications_service_creates_reads_and_deletes_application(users: tuple) -> None:
    """Create one application and verify the read and delete paths."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)

    # Act
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )
    loaded = await db.applications.get(organization.id, "dashboard")
    listed = await db.applications.list(organization.id, owner.id)
    deleted = await db.applications.delete(organization.id, application.id, deleted_id=owner.id)

    # Assert
    assert loaded is not None
    assert loaded.id == application.id
    assert len(listed) == 1
    assert deleted.deleted_at is not None
    assert await db.applications.get(organization.id, "dashboard") is None


async def test_compute_service_generates_proxy_secret_and_deletes_registry(users: tuple) -> None:
    """Create a compute registry with an internal proxy secret."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)

    # Act
    registry = await db.compute.create(
        kind=ComputeKind.kubernetes,
        name="primary",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.longlink.internal",
        location_id=location.id,
        user=owner,
    )
    deleted = await db.compute.delete(registry.id, deleted_id=owner.id)

    # Assert
    assert registry.proxy_secret
    assert deleted is not None
    assert deleted.deleted_at is not None
    assert await db.compute.list() == []


async def test_database_service_updates_existing_registry(users: tuple) -> None:
    """Update a database registry in place when the name already exists."""

    # Arrange
    owner = users[0]
    local_location = await db.locations.create("local", "Local testing", owner, Country.CH)
    remote_location = await db.locations.create("remote", "Remote testing", owner, Country.CH)

    # Act
    first_registry = await db.database.create(
        kind=DatabaseKind.postgresql,
        name="primary",
        host="db.local.longlink.internal",
        port=5432,
        username="longlink",
        password="secret",
        location_id=local_location.id,
        user=owner,
    )
    second_registry = await db.database.create(
        kind=DatabaseKind.postgresql,
        name="primary",
        host="db.remote.longlink.internal",
        port=5433,
        username="longlink",
        password="updated-secret",
        location_id=remote_location.id,
        user=owner,
    )

    # Assert
    assert second_registry.id == first_registry.id
    assert second_registry.host == "db.remote.longlink.internal"
    assert second_registry.port == 5433
    assert second_registry.location_id == remote_location.id
    assert len(await db.database.list()) == 1


async def test_storage_service_updates_existing_registry(users: tuple) -> None:
    """Update a storage registry in place when the name already exists."""

    # Arrange
    owner = users[0]
    local_location = await db.locations.create("local", "Local testing", owner, Country.CH)
    remote_location = await db.locations.create("remote", "Remote testing", owner, Country.CH)

    # Act
    first_registry = await db.storage.create(
        kind=StorageKind.s3,
        name="object-store",
        protocol="https",
        endpoint_url="https://storage.local.longlink.internal",
        access_key_id="access-key",
        secret_access_key="secret-key",
        location_id=local_location.id,
        user=owner,
    )
    second_registry = await db.storage.create(
        kind=StorageKind.s3,
        name="object-store",
        protocol="http",
        endpoint_url="http://storage.remote.longlink.internal",
        access_key_id="new-access-key",
        secret_access_key="new-secret-key",
        location_id=remote_location.id,
        user=owner,
    )

    # Assert
    assert second_registry.id == first_registry.id
    assert second_registry.protocol == "http"
    assert second_registry.endpoint_url == "http://storage.remote.longlink.internal"
    assert second_registry.location_id == remote_location.id
    assert len(await db.storage.list()) == 1


async def test_operations_service_tracks_claim_complete_and_reset(users: tuple) -> None:
    """Claim, complete, and reset one operation lifecycle."""

    # Arrange
    owner = users[0]
    location = await db.locations.create("local", "Local testing", owner, Country.CH)
    organization = await db.organizations.create("acme", location.id, owner)
    application = await db.applications.create(
        organization.id,
        "dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        user=owner,
    )

    # Act
    operation = await db.operations.create(OperationKind.application_create, step="verify", application_id=application.id, user=owner)
    claimed = await db.operations.claim(operation.id)
    completed = await db.operations.complete(operation.id)
    await db.operations.reset_active()

    # Assert
    assert operation.status == "scheduled"
    assert claimed is not None
    assert claimed.status == "active"
    assert completed is not None
    assert completed.status == "completed"
