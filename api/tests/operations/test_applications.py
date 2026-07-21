import pytest
from uuid import uuid4
from datetime import timedelta
from src.utils import names
from src.operations import computes as compute_operations
from src.utils.jobs import execute
from src.environments import env
from src.models.types import StorageKind
from longlink.utils.time import utcnow
from src.models.metadata import LongLinkMetadata
from src.models.statuses import ComputeStatus, ApplicationStatus, OrganizationStatus
from src.database.session import session_scope
from src.database.services import compute, operations, applications, organizations
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredCompute, ReconcileResult
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_compute_infrastructure(
    slug: str = "local",
) -> tuple[ComputeRegistry, DatabaseRegistry, StorageRegistry]:
    """Persist independent compute, database, and storage registries without queueing work."""

    # Handler tests need real registry rows while provider calls remain explicit boundaries.
    async with session_scope() as session:
        compute_registry = ComputeRegistry(
            name=f"{slug.title()} compute",
            slug=f"{slug}-compute",
            kubeconfig="apiVersion: v1\nclusters: []\n",
            proxy_secret="proxy-secret",
        )
        database_registry = DatabaseRegistry(
            name=f"{slug.title()} database",
            slug=f"{slug}-database",
            host="postgres.example",
            port=5432,
            password="control-password",
            username="longlink",
        )
        storage_registry = StorageRegistry(
            kind=StorageKind.minio,
            name=f"{slug.title()} storage",
            slug=f"{slug}-storage",
            endpoint_url="http://minio.example:9000",
            runtime_endpoint_url="http://minio:9000",
            access_key_id="control-access",
            secret_access_key="control-secret",
        )
        session.add_all([compute_registry, database_registry, storage_registry])
        await session.commit()
        await session.refresh(compute_registry)
        await session.refresh(database_registry)
        await session.refresh(storage_registry)
        return compute_registry, database_registry, storage_registry


async def test_execute_compute_reconcile_operation_converges_complete_desired_state(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reconcile active tenant state, persist gateway trust, and clean tombstoned provider state."""

    # Arrange
    compute_registry, database_registry, storage_registry = await create_compute_infrastructure()
    deleted_at = utcnow() - timedelta(minutes=1)
    active_organization_id = uuid4()
    active_organization = Organization(
        id=active_organization_id,
        name="Acme",
        slug="acme",
        country="CH",
        compute_id=compute_registry.id,
        database_id=database_registry.id,
        storage_id=storage_registry.id,
        shared_schema_url=f"postgresql://shared/{active_organization_id.hex}",
    )
    deleted_organization_id = uuid4()
    deleted_organization = Organization(
        id=deleted_organization_id,
        name="Retired",
        slug="retired",
        country="CH",
        compute_id=compute_registry.id,
        database_id=database_registry.id,
        storage_id=storage_registry.id,
        shared_schema_url=f"postgresql://shared/{deleted_organization_id.hex}",
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
    reconciliations: list[tuple[DesiredCompute, str, GatewayTLSMaterial | None]] = []

    class FakeDatabase:
        """Record database preparation and tombstone cleanup."""

        async def prepare_organization_database(self, organization_id, shared_schema_url: str) -> None:
            """Record Organization database preparation."""

            events.append(("prepare-database", organization_id, shared_schema_url))

        async def schema(self, organization_id, application_id, password: str) -> dict[str, str | int]:
            """Return stable runtime database connection fields."""

            events.append(("prepare-schema", organization_id, application_id, password))
            return {
                "host": "runtime-postgres",
                "port": 5432,
                "password": "runtime-database-password",
                "sslmode": "disable",
                "username": "runtime-user",
                "database_name": organization_id.hex,
            }

        async def delete_schema(self, organization_id, application_id) -> None:
            """Record Application schema cleanup."""

            events.append(("delete-schema", organization_id, application_id))

        async def delete_database(self, organization_id) -> None:
            """Record Organization database cleanup."""

            events.append(("delete-database", organization_id))

    class FakeStorage:
        """Record bucket preparation, credentials, and tombstone cleanup."""

        async def create(self, bucket: str) -> str:
            """Record and return one desired bucket."""

            events.append(("create-bucket", bucket))
            return bucket

        async def credentials(
            self,
            name: str,
            bucket: str,
            read_prefixes: tuple[str, ...],
            write_prefix: str,
        ) -> dict[str, str]:
            """Return stable Application storage credentials."""

            events.append(("create-credentials", name, bucket, read_prefixes, write_prefix))
            return {"access_key_id": "runtime-access", "secret_access_key": "runtime-secret"}

        async def revoke(self, name: str) -> None:
            """Record runtime credential revocation."""

            events.append(("revoke-credentials", name))

        async def delete_prefix(self, bucket: str, prefix: str) -> None:
            """Record Application prefix cleanup."""

            events.append(("delete-prefix", bucket, prefix))

        async def delete(self, bucket: str) -> None:
            """Record bucket cleanup."""

            events.append(("delete-bucket", bucket))

    class FakeKubernetes:
        """Capture the complete desired compute snapshot submitted by reconciliation."""

        def __init__(self, kubeconfig: str) -> None:
            """Accept only the compute registry kubeconfig."""

            assert kubeconfig == compute_registry.kubeconfig
            self.applications = self

        async def reconcile(
            self,
            desired: DesiredCompute,
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
            """Report the active Application Deployment ready."""

            events.append(("application-ready", application_id))
            return True

    fake_database = FakeDatabase()
    fake_storage = FakeStorage()

    def database_adapter(host: str, port: int, username: str, password: str) -> FakeDatabase:
        """Return the test database adapter for the selected registry."""

        assert (host, port, username, password) == (
            database_registry.host,
            database_registry.port,
            database_registry.username,
            database_registry.password,
        )
        return fake_database

    def storage_adapter(registry: StorageRegistry) -> FakeStorage:
        """Return the test storage adapter for the selected registry."""

        assert registry.id == storage_registry.id
        return fake_storage

    async def sync_organization_users(organization: Organization) -> None:
        """Record projection synchronization at its external boundary."""

        events.append(("sync-users", organization.id))

    async def image_metadata(image: str, envs: dict[str, str]) -> LongLinkMetadata:
        """Resolve the submitted tag to one immutable image reference."""

        assert image == "ghcr.io/longlink/dashboard:latest"
        assert envs == {"CUSTOM_VALUE": "configured"}
        metadata = LongLinkMetadata(digest="sha256:resolved")
        metadata.image = "ghcr.io/longlink/dashboard@sha256:resolved"
        return metadata

    monkeypatch.setattr(compute_operations.adapters, "Postgres", database_adapter)
    monkeypatch.setattr(compute_operations.adapters, "storage", storage_adapter)
    monkeypatch.setattr(compute_operations.projections, "sync_organization_users", sync_organization_users)
    monkeypatch.setattr(compute_operations.images, "metadata", image_metadata)
    monkeypatch.setattr(compute_operations, "Kubernetes", FakeKubernetes)
    operation = await operations.enqueue(compute_registry.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    assert claimed.id == operation.id

    # Act
    completed = await execute(claimed, compute_operations.reconcile)

    # Assert
    assert completed.status == "completed"
    assert completed.stopped_at is not None
    assert len(reconciliations) == 1
    desired, proxy_secret, existing_tls = reconciliations[0]
    assert desired.id == compute_registry.id
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
        "LONGLINK_DATABASE_SSLMODE": "disable",
        "LONGLINK_DATABASE_USERNAME": "runtime-user",
        "LONGLINK_STORAGE_BUCKET": names.organization_bucket(active_organization.id),
        "LONGLINK_STORAGE_ENDPOINT_URL": "http://minio:9000",
        "LONGLINK_STORAGE_PASSWORD": "runtime-secret",
        "LONGLINK_STORAGE_PREFIX": names.application_storage_prefix(active_application.id),
        "LONGLINK_STORAGE_SHARED_PREFIX": names.shared_storage_prefix(),
        "LONGLINK_STORAGE_USERNAME": "runtime-access",
    }
    assert proxy_secret == "proxy-secret"
    assert existing_tls is None
    assert ("delete-schema", deleted_organization.id, deleted_application.id) in events
    assert ("revoke-credentials", deleted_application.id.hex) in events
    assert (
        "delete-prefix",
        names.organization_bucket(deleted_organization.id),
        names.application_storage_prefix(deleted_application.id),
    ) in events
    assert ("delete-database", deleted_organization.id) in events
    assert ("delete-bucket", names.organization_bucket(deleted_organization.id)) in events

    refreshed_compute = await compute.get(compute_registry.id)
    refreshed_organization = await organizations.get(active_organization.id)
    refreshed_application = await applications.get(active_application.id)
    removed_organization = await organizations.get(deleted_organization.id, include_deleted=True)
    removed_application = await applications.get(deleted_application.id, include_deleted=True)
    assert refreshed_compute is not None
    assert refreshed_compute.status == ComputeStatus.ready
    assert refreshed_compute.version == env.VERSION
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


async def test_execute_compute_reconcile_operation_retries_transient_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Record a compute failure and schedule retryable reconciliation work."""

    # Arrange
    compute_registry, _, _ = await create_compute_infrastructure()

    class FailingKubernetes:
        """Raise a transient provider error after desired state is built."""

        def __init__(self, kubeconfig: str) -> None:
            """Accept only the compute registry kubeconfig."""

            assert kubeconfig == compute_registry.kubeconfig
            self.applications = self

        async def reconcile(
            self,
            desired: DesiredCompute,
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

    monkeypatch.setattr(compute_operations, "Kubernetes", FailingKubernetes)
    operation = await operations.enqueue(compute_registry.id)
    claimed = await operations.claim_next()
    assert claimed is not None
    assert claimed.id == operation.id

    # Act
    deferred = await execute(claimed, compute_operations.reconcile)

    # Assert
    expected_error = "https://<redacted>:<redacted>@db.example?token=<redacted>"
    assert deferred.status == "scheduled"
    assert deferred.started_at is None
    assert deferred.stopped_at is None
    assert deferred.attempt_count == 1
    assert deferred.error == expected_error
    refreshed_compute = await compute.get(compute_registry.id)
    assert refreshed_compute is not None
    assert refreshed_compute.status == ComputeStatus.failed
