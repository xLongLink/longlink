import pytest
from datetime import UTC, datetime, timedelta
from factories import create_application, create_organization, create_ready_infrastructure
from src.operations import organizations as organization_operations
from src.models.roles import OrganizationRoles
from src.models.statuses import Status
from src.database.session import get_session, session_scope
from src.database.services import organizations as organization_service
from longlink.shared.models import Audit
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.organizations import Organization


async def test_sync_users_projects_active_and_deleted_memberships(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Seed Organization memberships through the shared users schema boundary."""

    # Arrange
    owner, member = users[0], users[1]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    base_time = datetime.fromisoformat("2026-07-01T09:00:00+00:00")
    deleted_at = base_time + timedelta(minutes=2)
    calls: list[tuple[str, list[Audit]]] = []

    # Persist one deleted membership whose deactivation follows its last regular update.
    Session = await get_session()
    async with Session() as session:
        member_row = await session.get(User, member.id)
        assert member_row is not None
        member_row.updated_at = base_time
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
                updated_at=base_time + timedelta(minutes=1),
                deleted_at=deleted_at,
            )
        )
        await session.commit()

    async def sync(shared_schema_url: str, rows: list[Audit]) -> None:
        """Capture the shared audit payload."""

        calls.append((shared_schema_url, rows))

    monkeypatch.setattr(organization_service.shared_audit, "sync", sync)

    async with session_scope() as session:
        organization_row = await session.get(Organization, organization.id)
        assert organization_row is not None
        organization_row.status = Status.running
        await session.commit()

    async with session_scope() as session:
        await organization_service.sync_users(session, organization.id)

    # Assert
    rows = {row.id: row for row in calls[0][1]}
    assert rows[owner.id].role == OrganizationRoles.owner
    assert rows[owner.id].deleted_at is None
    assert rows[member.id].role == OrganizationRoles.write
    assert rows[member.id].deleted_at == deleted_at
    assert rows[member.id].updated_at == deleted_at


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

        async def delete_schema(self, organization_id: object, application_id: object) -> None:
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
    """Delete namespace, Application resources, providers, then the Organization tombstone."""

    # Arrange a tombstoned Organization with one Application to clean up.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    application = await create_application(organization)
    async with session_scope() as session:
        row = await session.get(Organization, organization.id)
        assert row is not None
        row.deleted_at = datetime.now(UTC)
        await session.commit()
    calls: list[str] = []

    class Database:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def delete_schema(self, organization_id: object, application_id: object) -> None:
            """Record Application schema deletion."""

            assert application_id == application.id
            calls.append("schema")

        async def delete_database(self, organization_id: object) -> None:
            """Record Organization database deletion."""

            calls.append("database")

    class Storage:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def revoke(self, name: str) -> None:
            """Record Application credential revocation."""

            assert name == application.id.hex
            calls.append("revoke")

        async def delete(self, bucket: str) -> None:
            """Record Organization bucket deletion."""

            calls.append("bucket")

    class Organizations:
        async def delete(self, namespace: str) -> None:
            """Record namespace deletion."""

            calls.append("namespace")

    class Kubernetes:
        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Expose Organization Kubernetes operations."""

            self.organizations = Organizations()

    original_purge = organization_operations.organizations.purge

    async def purge(session: object, organization_id: object) -> None:
        """Record and perform final tombstone removal."""

        calls.append("purge")
        await original_purge(session, organization_id)  # type: ignore[arg-type]

    monkeypatch.setattr(organization_operations, "Postgres", Database)
    monkeypatch.setattr(organization_operations, "Exoscale", Storage)
    monkeypatch.setattr(organization_operations, "Kubernetes", Kubernetes)
    monkeypatch.setattr(organization_operations.organizations, "purge", purge)

    # Complete cleanup and inspect the irreversible ordering and final purge.
    assert await organization_operations.delete(organization.id) is None
    async with session_scope() as session:
        assert await session.get(Organization, organization.id) is None
    assert calls == ["namespace", "schema", "revoke", "database", "bucket", "purge"]
