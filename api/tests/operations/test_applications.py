import pytest
from datetime import timedelta
from src.utils import names
from src.operations import locations as location_operations
from src.utils.jobs import execute
from src.environments import env
from longlink.utils.time import utcnow
from src.models.metadata import LongLinkMetadata
from src.models.statuses import LocationStatus, ApplicationStatus, OrganizationStatus
from src.models.storages import StorageKind
from src.database.session import session_scope
from src.models.databases import DatabaseKind
from src.database.services import compute, locations, operations, applications, organizations
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredLocation, ReconcileResult
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.locations import Location
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_location_infrastructure(slug: str = "local") -> tuple[Location, ComputeRegistry]:
    """Persist one complete location aggregate without queueing work."""

    # Handler tests need real registry rows while provider calls remain explicit boundaries.
    async with session_scope() as session:
        location = Location(name=slug.title(), slug=slug, country="CH", version=None)
        compute_registry = ComputeRegistry(
            name=f"{slug.title()} compute",
            slug=f"{slug}-compute",
            kubeconfig="apiVersion: v1\nclusters: []\n",
            proxy_secret="proxy-secret",
            location_id=location.id,
        )
        database_registry = DatabaseRegistry(
            kind=DatabaseKind.postgresql,
            name=f"{slug.title()} database",
            slug=f"{slug}-database",
            host="postgres.example",
            port=5432,
            password="control-password",
            username="longlink",
            location_id=location.id,
        )
        storage_registry = StorageRegistry(
            kind=StorageKind.minio,
            name=f"{slug.title()} storage",
            slug=f"{slug}-storage",
            endpoint_url="http://minio.example:9000",
            runtime_endpoint_url="http://minio:9000",
            access_key_id="control-access",
            secret_access_key="control-secret",
            location_id=location.id,
        )
        session.add_all([location, compute_registry, database_registry, storage_registry])
        await session.commit()
        await session.refresh(location)
        await session.refresh(compute_registry)
        return location, compute_registry


async def test_execute_location_reconcile_operation_converges_complete_desired_state(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reconcile active tenant state, persist gateway trust, and clean tombstoned provider state."""

    # Arrange
    location, compute_registry = await create_location_infrastructure()
    deleted_at = utcnow() - timedelta(minutes=1)
    active_organization = Organization(name="Acme", slug="acme", location_id=location.id)
    deleted_organization = Organization(
        name="Retired",
        slug="retired",
        location_id=location.id,
        status=OrganizationStatus.deleting,
        deleted_at=deleted_at,
    )
    active_application = Application(
        organization_id=active_organization.id,
        name="Dashboard",
        slug="dashboard",
        image="ghcr.io/longlink/dashboard:latest",
        database_password="database-password",
        envs={"CUSTOM_VALUE": "configured"},
    )
    deleted_application = Application(
        organization_id=deleted_organization.id,
        name="Legacy",
        slug="legacy",
        image="ghcr.io/longlink/legacy@sha256:resolved",
        database_password="legacy-password",
        status=ApplicationStatus.deleting,
        deleted_at=deleted_at,
    )
    async with session_scope() as session:
        session.add_all([active_organization, deleted_organization, active_application, deleted_application])
        await session.commit()

    events: list[tuple[object, ...]] = []
    reconciliations: list[tuple[DesiredLocation, str, GatewayTLSMaterial | None]] = []

    class FakeDatabase:
        """Record database preparation and tombstone cleanup."""

        def shared_schema_url(self, organization_id) -> str:
            """Return one deterministic shared-schema URL."""

            events.append(("shared-schema-url", organization_id))
            return f"postgresql://shared/{organization_id.hex}"

        async def prepare_organization_database(self, organization_id, shared_schema_url: str) -> None:
            """Record organization database preparation."""

            events.append(("prepare-database", organization_id, shared_schema_url))

        async def schema(self, organization_id, application_id, password: str) -> dict[str, str | int]:
            """Return stable runtime database connection fields."""

            events.append(("prepare-schema", organization_id, application_id, password))
            return {
                "host": "runtime-postgres",
                "port": 5432,
                "password": "runtime-database-password",
                "username": "runtime-user",
                "database_name": organization_id.hex,
            }

        async def delete_schema(self, organization_id, application_id) -> None:
            """Record application schema cleanup."""

            events.append(("delete-schema", organization_id, application_id))

        async def delete_database(self, organization_id) -> None:
            """Record organization database cleanup."""

            events.append(("delete-database", organization_id))

    class FakeStorage:
        """Record bucket preparation, credentials, and tombstone cleanup."""

        async def create(self, bucket: str) -> str:
            """Record and return one desired bucket."""

            events.append(("create-bucket", bucket))
            return bucket

        async def credentials(self, bucket: str, access: str) -> dict[str, str]:
            """Return stable application storage credentials."""

            events.append(("create-credentials", bucket, access))
            return {"access_key_id": "runtime-access", "secret_access_key": "runtime-secret"}

        async def revoke(self, bucket: str) -> None:
            """Record runtime credential revocation."""

            events.append(("revoke-credentials", bucket))

        async def delete(self, bucket: str) -> None:
            """Record bucket cleanup."""

            events.append(("delete-bucket", bucket))

    class FakeKubernetes:
        """Capture the complete desired location submitted by reconciliation."""

        def __init__(self, kubeconfig: str) -> None:
            """Accept only the location compute registry kubeconfig."""

            assert kubeconfig == compute_registry.kubeconfig
            self.applications = self

        async def reconcile(
            self,
            desired: DesiredLocation,
            proxy_secret: str,
            existing_tls: GatewayTLSMaterial | None = None,
            fence=None,
            stage_tls=None,
        ) -> ReconcileResult:
            """Return stable gateway connection material."""

            reconciliations.append((desired, proxy_secret, existing_tls))
            return ReconcileResult(
                gateway_url="https://gateway.example",
                gateway_ca_certificate="gateway-ca",
                gateway_tls_certificate="gateway-certificate",
                gateway_tls_private_key="gateway-private-key",
            )

        async def ready(self, application_id: str) -> bool:
            """Report the active application Deployment ready."""

            events.append(("application-ready", application_id))
            return True

    fake_database = FakeDatabase()
    fake_storage = FakeStorage()

    def database_adapter(registry: DatabaseRegistry) -> FakeDatabase:
        """Return the test database adapter for the persisted registry."""

        assert registry.location_id == location.id
        return fake_database

    def storage_adapter(registry: StorageRegistry) -> FakeStorage:
        """Return the test storage adapter for the persisted registry."""

        assert registry.location_id == location.id
        return fake_storage

    async def sync_organization_users(organization: Organization) -> None:
        """Record projection synchronization at its external boundary."""

        events.append(("sync-users", organization.id))

    async def image_metadata(payload) -> LongLinkMetadata:
        """Resolve the submitted tag to one immutable image reference."""

        assert payload.image == "ghcr.io/longlink/dashboard:latest"
        metadata = LongLinkMetadata(digest="sha256:resolved")
        metadata.image = "ghcr.io/longlink/dashboard@sha256:resolved"
        return metadata

    monkeypatch.setattr(location_operations.adapters, "database", database_adapter)
    monkeypatch.setattr(location_operations.adapters, "storage", storage_adapter)
    monkeypatch.setattr(location_operations.projections, "sync_organization_users", sync_organization_users)
    monkeypatch.setattr(location_operations.environments, "application_image_metadata", image_metadata)
    monkeypatch.setattr(location_operations, "Kubernetes", FakeKubernetes)
    operation = await operations.enqueue(location.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    assert claimed.id == operation.id

    # Act
    completed = await execute(claimed, location_operations.reconcile)

    # Assert
    assert completed.status == "completed"
    assert completed.stopped_at is not None
    assert len(reconciliations) == 1
    desired, proxy_secret, existing_tls = reconciliations[0]
    assert desired.id == location.id
    assert desired.deleting is False
    assert [(item.id, item.slug) for item in desired.organizations] == [(active_organization.id, "acme")]
    assert len(desired.applications) == 1
    desired_application = desired.applications[0]
    assert desired_application.id == active_application.id
    assert desired_application.organization_id == active_organization.id
    assert desired_application.namespace == "acme"
    assert desired_application.image == "ghcr.io/longlink/dashboard@sha256:resolved"
    assert desired_application.envs == {
        "CUSTOM_VALUE": "configured",
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": "runtime-postgres",
        "LONGLINK_DATABASE_NAME": active_organization.id.hex,
        "LONGLINK_DATABASE_PASSWORD": "runtime-database-password",
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SCHEMA": active_application.id.hex,
        "LONGLINK_DATABASE_USERNAME": "runtime-user",
        "LONGLINK_STORAGE_BUCKET": names.application_bucket(active_application.id),
        "LONGLINK_STORAGE_ENDPOINT_URL": "http://minio:9000",
        "LONGLINK_STORAGE_PASSWORD": "runtime-secret",
        "LONGLINK_STORAGE_SHARED_BUCKET": names.organization_shared_bucket(active_organization.id),
        "LONGLINK_STORAGE_USERNAME": "runtime-access",
    }
    assert proxy_secret == "proxy-secret"
    assert existing_tls is None
    assert ("delete-schema", deleted_organization.id, deleted_application.id) in events
    assert ("revoke-credentials", names.application_bucket(deleted_application.id)) in events
    assert ("delete-bucket", names.application_bucket(deleted_application.id)) in events
    assert ("delete-database", deleted_organization.id) in events
    assert ("delete-bucket", names.organization_shared_bucket(deleted_organization.id)) in events

    refreshed_location = await locations.get(location.id)
    refreshed_compute = await compute.location(location.id)
    refreshed_organization = await organizations.get(active_organization.id)
    refreshed_application = await applications.get(active_application.id)
    removed_organization = await organizations.get(deleted_organization.id, include_deleted=True)
    removed_application = await applications.get(deleted_application.id, include_deleted=True)
    assert refreshed_location is not None
    assert refreshed_location.status == LocationStatus.ready
    assert refreshed_location.version == env.VERSION
    assert refreshed_compute is not None
    assert refreshed_compute.gateway_url == "https://gateway.example"
    assert refreshed_compute.gateway_ca_certificate == "gateway-ca"
    assert refreshed_compute.gateway_tls_certificate == "gateway-certificate"
    assert refreshed_compute.gateway_tls_private_key == "gateway-private-key"
    assert refreshed_organization is not None
    assert refreshed_organization.status == OrganizationStatus.running
    assert refreshed_organization.shared_schema_url == f"postgresql://shared/{active_organization.id.hex}"
    assert refreshed_application is not None
    assert refreshed_application.status == ApplicationStatus.running
    assert refreshed_application.image == "ghcr.io/longlink/dashboard@sha256:resolved"
    assert refreshed_application.digest == "sha256:resolved"
    assert refreshed_application.storage_access_key_id == "runtime-access"
    assert refreshed_application.storage_secret_access_key == "runtime-secret"
    assert removed_organization is None
    assert removed_application is None


async def test_execute_location_reconcile_operation_retries_transient_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Record a location failure and schedule retryable reconciliation work."""

    # Arrange
    location, compute_registry = await create_location_infrastructure()

    class FailingKubernetes:
        """Raise a transient provider error after desired state is built."""

        def __init__(self, kubeconfig: str) -> None:
            """Accept only the location compute registry kubeconfig."""

            assert kubeconfig == compute_registry.kubeconfig
            self.applications = self

        async def reconcile(
            self,
            desired: DesiredLocation,
            proxy_secret: str,
            existing_tls: GatewayTLSMaterial | None = None,
            fence=None,
            stage_tls=None,
        ) -> ReconcileResult:
            """Fail one provider reconciliation attempt."""

            assert desired.organizations == ()
            assert desired.applications == ()
            assert proxy_secret == "proxy-secret"
            assert existing_tls is None
            raise RuntimeError("https://admin:password@db.example?token=secret")

    def database_adapter(registry: DatabaseRegistry) -> object:
        """Return an unused database adapter for the empty tenant snapshot."""

        assert registry.location_id == location.id
        return object()

    def storage_adapter(registry: StorageRegistry) -> object:
        """Return an unused storage adapter for the empty tenant snapshot."""

        assert registry.location_id == location.id
        return object()

    monkeypatch.setattr(location_operations.adapters, "database", database_adapter)
    monkeypatch.setattr(location_operations.adapters, "storage", storage_adapter)
    monkeypatch.setattr(location_operations, "Kubernetes", FailingKubernetes)
    operation = await operations.enqueue(location.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    assert claimed.id == operation.id

    # Act
    deferred = await execute(claimed, location_operations.reconcile)

    # Assert
    expected_error = "https://<redacted>:<redacted>@db.example?token=<redacted>"
    assert deferred.status == "scheduled"
    assert deferred.started_at is None
    assert deferred.stopped_at is None
    assert deferred.attempt_count == 1
    assert deferred.error == expected_error
    refreshed_location = await locations.get(location.id)
    assert refreshed_location is not None
    assert refreshed_location.status == LocationStatus.failed
