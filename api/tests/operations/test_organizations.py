import pytest
from uuid import uuid4
from datetime import UTC, datetime
from factories import create_solution, create_organization, create_ready_infrastructure
from src.operations import organizations as organization_operations
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


async def test_reconcile_prepares_providers_namespace_and_publishes_organization(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reconcile every Organization boundary before publishing the Organization."""

    # Arrange an unpublished Organization with ready immutable infrastructure.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    calls: list[str] = []

    class Database:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def prepare_organization_database(self, organization_id: object) -> None:
            """Record database preparation."""

            calls.append("database")

    class Storage:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def create(self, bucket: str) -> None:
            """Record bucket creation."""

            calls.append("storage")

    class Organizations:
        async def apply(self, namespace: str) -> None:
            """Record namespace reconciliation."""

            calls.append("namespace")

    class Kubernetes:
        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Expose Organization Kubernetes operations."""

            self.organizations = Organizations()

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    async def sync_users(session: object, organization_id: object) -> None:
        """Record user projection after publication."""

        calls.append("users")

    monkeypatch.setattr(organization_operations, "Postgres", Database)
    monkeypatch.setattr(organization_operations, "Exoscale", Storage)
    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)
    monkeypatch.setattr(organization_operations.organizations, "sync_users", sync_users)

    # Reconcile and inspect the published state.
    await organization_operations.reconcile(organization.id)
    async with session_scope() as session:
        refreshed = await session.get(Organization, organization.id)

    # Every boundary completes before user projection and status publication.
    assert calls == ["database", "storage", "namespace", "users"]
    assert refreshed is not None
    assert refreshed.status == Status.running


async def test_reconcile_rolls_back_publication_when_user_projection_fails(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep an Organization unpublished when its user projection fails."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    calls: list[str] = []

    class Database:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def prepare_organization_database(self, organization_id: object) -> None:
            """Record database preparation."""

            assert organization_id == organization.id
            calls.append("database")

    class Storage:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def create(self, bucket: str) -> None:
            """Record bucket creation."""

            assert bucket == organization.id.hex
            calls.append("storage")

    class Organizations:
        async def apply(self, namespace: str) -> None:
            """Record namespace reconciliation."""

            assert namespace == organization.id.hex
            calls.append("namespace")

    class Kubernetes:
        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Expose Organization Kubernetes operations."""

            self.organizations = Organizations()

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    async def sync_users(_session: object, organization_id: object) -> None:
        """Fail the user projection after every external boundary is ready."""

        assert organization_id == organization.id
        calls.append("users")
        raise RuntimeError("user projection failed")

    monkeypatch.setattr(organization_operations, "Postgres", Database)
    monkeypatch.setattr(organization_operations, "Exoscale", Storage)
    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)
    monkeypatch.setattr(organization_operations.organizations, "sync_users", sync_users)

    # Act and assert
    with pytest.raises(RuntimeError, match="user projection failed"):
        await organization_operations.reconcile(organization.id)
    async with session_scope() as session:
        refreshed = await session.get(Organization, organization.id)
    assert calls == ["database", "storage", "namespace", "users"]
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

    monkeypatch.setattr(organization_operations, "Postgres", Provider)
    monkeypatch.setattr(organization_operations, "Exoscale", Provider)
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
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
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

    monkeypatch.setattr(organization_operations, "Postgres", Provider)
    monkeypatch.setattr(organization_operations, "Exoscale", Provider)
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
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    calls: list[str] = []

    class Provider:
        """Capture unexpected provider construction."""

        def __init__(self, *args: object) -> None:
            """Record unexpected provider construction."""

            calls.append("provider")

    monkeypatch.setattr(organization_operations, "Postgres", Provider)
    monkeypatch.setattr(organization_operations, "Exoscale", Provider)
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

    monkeypatch.setattr(organization_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(organization_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(organization_operations, "Kubernetes", unexpected_provider)

    # Act and assert
    assert await organization_operations.delete(uuid4()) is None


async def test_delete_stops_when_namespace_deletion_fails(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep provider data intact when Kubernetes namespace deletion fails."""

    # Arrange a tombstoned Organization whose namespace cannot terminate.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    async with session_scope() as session:
        row = await session.get(Organization, organization.id)
        assert row is not None
        row.deleted_at = datetime.now(UTC)
        await session.commit()
    calls: list[str] = []

    class Database:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def delete_solution_schema(self, organization_id: object, solution_id: object) -> None:
            """Record unexpected schema deletion."""

            calls.append("schema")

        async def delete_database(self, organization_id: object) -> None:
            """Record unexpected database deletion."""

            calls.append("database")

    class Storage:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def revoke(self, name: str) -> None:
            """Record unexpected credential revocation."""

            calls.append("revoke")

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

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    monkeypatch.setattr(organization_operations, "Postgres", Database)
    monkeypatch.setattr(organization_operations, "Exoscale", Storage)
    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)

    # Namespace failure must prevent destructive provider cleanup.
    with pytest.raises(RuntimeError, match="namespace deletion failed"):
        await organization_operations.delete(organization.id)
    assert calls == []


async def test_delete_tears_down_organization_boundaries_in_order(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Delete namespace, Solution resources, providers, then the Organization tombstone."""

    # Arrange a tombstoned Organization and an active sibling on the same infrastructure.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    solution = await create_solution(organization)
    sibling_organization = await create_organization(users[1], name="sibling", infrastructure=infrastructure)
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

        async def delete_solution_schema(self, organization_id: object, solution_id: object) -> None:
            """Record Solution schema deletion."""

            assert organization_id == organization.id
            assert solution_id == solution.id
            calls.append("schema")

        async def delete_database(self, organization_id: object) -> None:
            """Record Organization database deletion."""

            assert organization_id == organization.id
            calls.append("database")

    class Storage:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def revoke_solution(self, name: str) -> None:
            """Record Solution credential revocation."""

            assert name == solution.id.hex
            calls.append("revoke")

        async def delete(self, bucket: str) -> None:
            """Record Organization bucket deletion."""

            assert bucket == organization.id.hex
            calls.append("bucket")

    class Organizations:
        async def delete(self, namespace: str) -> None:
            """Record namespace deletion."""

            assert namespace == organization.id.hex
            calls.append("namespace")

    class Kubernetes:
        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Expose Organization Kubernetes operations."""

            self.organizations = Organizations()

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    monkeypatch.setattr(organization_operations, "Postgres", Database)
    monkeypatch.setattr(organization_operations, "Exoscale", Storage)
    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)

    # Complete cleanup and inspect irreversible resource deletion order.
    assert await organization_operations.delete(organization.id) is None
    async with session_scope() as session:
        assert await session.get(Organization, organization.id) is None
        assert await session.get(Solution, solution.id) is None
        assert await session.get(Organization, sibling_organization.id) is not None
        assert await session.get(Solution, sibling_solution.id) is not None
    assert calls == ["namespace", "schema", "revoke", "database", "bucket"]
