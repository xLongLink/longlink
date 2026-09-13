import pytest
from uuid import UUID, uuid4
from conftest import DatabasePostgres, StorageKubernetes
from datetime import UTC, datetime
from factories import create_solution, create_organization, create_ready_compute
from src.operations import organizations as organization_operations
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization

pytestmark = pytest.mark.usefixtures("database_runtime")


async def test_reconcile_prepares_providers_namespace_and_publishes_organization(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reconcile every Organization boundary before publishing the Organization."""

    # Arrange an unpublished Organization with ready immutable infrastructure.
    compute = await create_ready_compute()
    organization = await create_organization(users[0], compute=compute)
    calls: list[str] = []

    class Database(DatabasePostgres):
        async def prepare_organization_database(self, organization_id: object) -> None:
            """Record database preparation."""

            calls.append("database")

    class Storage(StorageKubernetes):
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def bucket(self, organization: UUID, compute: object):
            """Record bucket creation."""

            calls.append("storage")
            return await super().bucket(organization, compute)

    class Organizations:
        async def apply(self, namespace: str) -> None:
            """Record namespace reconciliation."""

            assert namespace == f"longlink-compute-{organization.id.hex}"
            calls.append("namespace")

    class Kubernetes:
        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Expose Organization Kubernetes operations."""

            self.organizations = Organizations()
            self.storage = Storage()

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    async def sync_users(*args: object, **kwargs: object) -> None:
        """Record user projection after publication."""

        calls.append("users")

    monkeypatch.setattr(organization_operations.databases.postgres, "Postgres", Database)
    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)
    monkeypatch.setattr(organization_operations.organizations.shared_audit, "sync", sync_users)

    # Reconcile and inspect the published state.
    await organization_operations.reconcile(organization.id)
    async with session_scope() as session:
        refreshed = await session.get(Organization, organization.id)

    # Every boundary completes before user projection and status publication.
    assert calls == ["database", "users", "storage", "namespace"]
    assert refreshed is not None
    assert refreshed.status == Status.running


async def test_reconcile_rolls_back_publication_when_user_projection_fails(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep an Organization unpublished when its user projection fails."""

    # Arrange
    compute = await create_ready_compute()
    organization = await create_organization(users[0], compute=compute)
    calls: list[str] = []

    class Database(DatabasePostgres):
        async def prepare_organization_database(self, organization_id: object) -> None:
            """Record database preparation."""

            assert organization_id == organization.id
            calls.append("database")

    class Organizations:
        async def apply(self, namespace: str) -> None:
            """Record namespace reconciliation."""

            assert namespace == f"longlink-compute-{organization.id.hex}"
            calls.append("namespace")

    class Kubernetes:
        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Expose Organization Kubernetes operations."""

            self.organizations = Organizations()
            self.storage = StorageKubernetes()

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    async def sync_users(*args: object, **kwargs: object) -> None:
        """Fail the user projection after every external boundary is ready."""

        calls.append("users")
        raise RuntimeError("user projection failed")

    monkeypatch.setattr(organization_operations.databases.postgres, "Postgres", Database)
    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)
    monkeypatch.setattr(organization_operations.organizations.shared_audit, "sync", sync_users)

    # Act and assert
    with pytest.raises(RuntimeError, match="user projection failed"):
        await organization_operations.reconcile(organization.id)
    async with session_scope() as session:
        refreshed = await session.get(Organization, organization.id)
    assert calls == ["database", "users"]
    assert refreshed is not None
    assert refreshed.status == Status.creating


async def test_reconcile_skips_missing_organization_without_constructing_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    """Treat a missing Organization as an already completed reconciliation target."""

    # Arrange
    calls: list[str] = []

    class Provider:
        """Capture unexpected provider construction."""

        def __init__(self, *args: object) -> None:
            """Record unexpected provider construction."""

            calls.append("provider")

    monkeypatch.setattr(organization_operations.databases.postgres, "Postgres", Provider)
    monkeypatch.setattr(organization_operations, "Kubernetes", Provider)

    # Act
    await organization_operations.reconcile(uuid4())

    # Assert
    assert calls == []


async def test_reconcile_skips_deleted_organization_without_constructing_providers(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Avoid provider work after an Organization has been tombstoned."""

    # Arrange
    compute = await create_ready_compute()
    organization = await create_organization(users[0], compute=compute)
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.deleted_at = datetime.now(UTC)
        await session.commit()
    calls: list[str] = []

    class Provider:
        """Capture unexpected provider construction."""

        def __init__(self, *args: object) -> None:
            """Record unexpected provider construction."""

            calls.append("provider")

    monkeypatch.setattr(organization_operations.databases.postgres, "Postgres", Provider)
    monkeypatch.setattr(organization_operations, "Kubernetes", Provider)

    # Act
    await organization_operations.reconcile(organization.id)

    # Assert
    assert calls == []


async def test_delete_rejects_active_organization_without_external_cleanup(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject cleanup for an active Organization before constructing providers."""

    # Arrange
    compute = await create_ready_compute()
    organization = await create_organization(users[0], compute=compute)
    calls: list[str] = []

    class Provider:
        """Capture unexpected provider construction."""

        def __init__(self, *args: object) -> None:
            """Record unexpected provider construction."""

            calls.append("provider")

    monkeypatch.setattr(organization_operations.databases.postgres, "Postgres", Provider)
    monkeypatch.setattr(organization_operations, "Kubernetes", Provider)

    # Act
    reason = await organization_operations.delete(organization.id)

    # Assert
    assert reason == "Active Organizations cannot be deleted by lifecycle cleanup"
    assert calls == []


async def test_delete_skips_missing_organization_without_external_cleanup(monkeypatch: pytest.MonkeyPatch) -> None:
    """Treat a missing Organization tombstone as completed cleanup."""

    # Arrange
    def unexpected_provider(*_args: object) -> object:
        """Reject provider construction for an absent cleanup target."""

        raise AssertionError("providers must not be constructed")

    monkeypatch.setattr(organization_operations.databases.postgres, "Postgres", unexpected_provider)
    monkeypatch.setattr(organization_operations, "Kubernetes", unexpected_provider)

    # Act and assert
    assert await organization_operations.delete(uuid4()) is None


async def test_delete_stops_when_namespace_deletion_fails(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep provider data intact when Kubernetes namespace deletion fails."""

    # Arrange a tombstoned Organization whose namespace cannot terminate.
    compute = await create_ready_compute()
    organization = await create_organization(users[0], compute=compute)
    async with session_scope() as session:
        row = await session.get(Organization, organization.id)
        assert row is not None
        row.deleted_at = datetime.now(UTC)
        await session.commit()
    calls: list[str] = []

    class Database:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def delete(self, organization_id: UUID) -> None:
            """Record unexpected database deletion."""

            calls.append("database")

    class Storage:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def delete(self, bucket: str) -> None:
            """Record unexpected bucket deletion."""

            calls.append("bucket")

    class Organizations:
        async def delete(self, namespace: str) -> None:
            """Fail namespace deletion."""

            raise RuntimeError("namespace deletion failed")

    class Kubernetes:
        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Expose the failing Organization Kubernetes operations."""

            self.organizations = Organizations()
            self.databases = Database()
            self.storage = Storage()

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)

    # Namespace failure must prevent destructive provider cleanup.
    with pytest.raises(RuntimeError, match="namespace deletion failed"):
        await organization_operations.delete(organization.id)
    assert calls == []


async def test_delete_tears_down_organization_boundaries_in_order(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete the namespace, database and roles, storage, then the Organization tombstone."""

    # Arrange a tombstoned Organization and an active sibling on the same infrastructure.
    compute = await create_ready_compute()
    organization = await create_organization(users[0], compute=compute)
    solution = await create_solution(organization)
    sibling_organization = await create_organization(users[1], name="sibling", compute=compute)
    sibling_solution = await create_solution(sibling_organization)
    async with session_scope() as session:
        row = await session.get(Organization, organization.id)
        assert row is not None
        row.deleted_at = datetime.now(UTC)
        await session.commit()
    calls: list[str] = []

    class Database:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def delete(self, organization_id: UUID) -> None:
            """Record Organization database and scoped runtime-role deletion."""

            assert organization_id == organization.id
            calls.append("database")

    class Storage:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def delete(self, organization_id: UUID, compute: object) -> None:
            """Record Organization bucket and identity deletion."""

            assert organization_id == organization.id
            calls.append("bucket")

    class Organizations:
        async def delete(self, namespace: str) -> None:
            """Record namespace deletion."""

            assert namespace == f"longlink-compute-{organization.id.hex}"
            calls.append("namespace")

    class Kubernetes:
        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Expose Organization Kubernetes operations."""

            self.organizations = Organizations()
            self.databases = Database()
            self.storage = Storage()

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)

    # Complete cleanup and inspect irreversible resource deletion order.
    assert await organization_operations.delete(organization.id) is None
    async with session_scope() as session:
        assert await session.get(Organization, organization.id) is None
        assert await session.get(Solution, solution.id) is None
        assert await session.get(Organization, sibling_organization.id) is not None
        assert await session.get(Solution, sibling_solution.id) is not None
    assert calls == ["namespace", "database", "bucket"]
