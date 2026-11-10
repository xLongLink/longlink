import json
import pytest
import stripe
import asyncio
from uuid import UUID, uuid4
from fastapi import HTTPException
from conftest import DatabasePostgres, StorageKubernetes, DatabaseKubernetes, reject_provider_construction
from datetime import UTC, datetime
from factories import create_compute, create_solution, create_organization
from urllib.parse import parse_qs, urlsplit
from src.operations import organizations as organization_operations
from collections.abc import Sequence
from src.environments import env
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import organizations
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization, OrganizationActivity


@pytest.mark.usefixtures("database_runtime")
async def test_reconcile_prepares_providers_namespace_and_publishes_organization(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reconcile every Organization boundary before publishing the Organization."""

    # Arrange an unpublished Organization with ready immutable infrastructure.
    organization = await create_organization(users[0])

    # Observe cleanup ordering at external infrastructure boundaries.
    calls: list[str] = []

    class Database(DatabasePostgres):
        async def prepare_organization_database(self, organization: UUID) -> None:
            """Record database preparation."""

            calls.append("database")

    class Storage(StorageKubernetes):
        async def apply(self, organization: UUID, *, quota_bytes: int) -> None:
            """Record bucket creation."""

            calls.append("storage")
            await super().apply(organization, quota_bytes=quota_bytes)

    async def apply(client: object, organization_id: UUID) -> None:
        """Record namespace reconciliation."""

        assert organization_id == organization.id
        calls.append("namespace")

    async def synchronize(client: object, organization_id: UUID) -> None:
        """Record pull-secret reconciliation at the external-system boundary."""

        assert organization_id == organization.id
        calls.append("registries")

    monkeypatch.setattr(organization_operations.database_resources.postgres, "Postgres", Database)
    monkeypatch.setattr(organization_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(organization_operations, "Storage", Storage)
    monkeypatch.setattr(organization_operations.organizations, "apply", apply)
    monkeypatch.setattr(organization_operations.registries, "synchronize", synchronize)

    # Reconcile and inspect the published state.
    await organization_operations.reconcile(organization.id)
    async with session_scope() as session:
        refreshed = await session.get(Organization, organization.id)

    # Every boundary completes before status publication.
    assert calls == ["database", "storage", "namespace", "registries"]
    assert refreshed is not None
    assert refreshed.status == Status.running


@pytest.mark.usefixtures("database_runtime")
async def test_reconcile_rolls_back_publication_when_storage_fails(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep an Organization unpublished when its storage boundary fails."""

    # Arrange
    organization = await create_organization(users[0])

    class Storage(StorageKubernetes):
        async def apply(self, organization: UUID, *, quota_bytes: int) -> None:
            """Fail bucket creation."""

            raise RuntimeError("storage failed")

    monkeypatch.setattr(organization_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(organization_operations, "Storage", Storage)

    # Act and assert
    with pytest.raises(RuntimeError, match="storage failed"):
        await organization_operations.reconcile(organization.id)
    async with session_scope() as session:
        refreshed = await session.get(Organization, organization.id)
    assert refreshed is not None
    assert refreshed.status == Status.creating


async def test_reconcile_skips_missing_organization_without_constructing_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    """Treat a missing Organization as an already completed reconciliation target."""

    # Arrange
    reject_provider_construction(
        monkeypatch, (organization_operations.database_resources.postgres, "Postgres"), (organization_operations, "Kubernetes")
    )

    # Act and assert
    await organization_operations.reconcile(uuid4())


async def test_reconcile_skips_deleted_organization_without_constructing_providers(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Avoid provider work after an Organization has been tombstoned."""

    # Arrange
    organization = await create_organization(users[0])
    async with session_scope() as session:
        persisted = await session.get(Organization, organization.id)
        assert persisted is not None
        persisted.deleted_at = datetime.now(UTC)
        await session.commit()
    reject_provider_construction(
        monkeypatch, (organization_operations.database_resources.postgres, "Postgres"), (organization_operations, "Kubernetes")
    )

    # Act and assert
    await organization_operations.reconcile(organization.id)


async def test_delete_rejects_active_organization_without_external_cleanup(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject cleanup for an active Organization before constructing providers."""

    # Arrange
    organization = await create_organization(users[0])
    reject_provider_construction(
        monkeypatch, (organization_operations.database_resources.postgres, "Postgres"), (organization_operations, "Kubernetes")
    )

    # Act and assert
    with pytest.raises(HTTPException, match="Active Organizations cannot be deleted by lifecycle cleanup"):
        await organization_operations.delete(organization.id)


async def test_delete_skips_missing_organization_without_external_cleanup(monkeypatch: pytest.MonkeyPatch) -> None:
    """Treat a missing Organization tombstone as completed cleanup."""

    # Arrange
    reject_provider_construction(
        monkeypatch, (organization_operations.database_resources.postgres, "Postgres"), (organization_operations, "Kubernetes")
    )

    # Act and assert
    assert await organization_operations.delete(uuid4()) is None


async def test_delete_stops_when_namespace_deletion_fails(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep provider data intact when Kubernetes namespace deletion fails."""

    # Arrange a tombstoned Organization whose namespace cannot terminate.
    organization = await create_organization(users[0])
    async with session_scope() as session:
        row = await session.get(Organization, organization.id)
        assert row is not None

        # Persist a tombstone before invoking lifecycle cleanup.
        row.deleted_at = datetime.now(UTC)

        # Commit deletion eligibility before observing external cleanup calls.
        await session.commit()

    async def delete(client: object, name: str) -> None:
        """Fail namespace deletion before destructive provider cleanup."""

        assert name == f"longlink-compute-{organization.id.hex}"
        raise RuntimeError("namespace deletion failed")

    monkeypatch.setattr(organization_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(organization_operations.utils, "delete_namespace", delete)
    reject_provider_construction(monkeypatch, (organization_operations, "Storage"))

    # Namespace failure must prevent destructive provider cleanup.
    with pytest.raises(RuntimeError, match="namespace deletion failed"):
        await organization_operations.delete(organization.id)


async def test_delete_tears_down_organization_boundaries_in_order(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete the namespace, database and roles, storage, then the Organization tombstone."""

    # Arrange a tombstoned Organization and an active sibling on the same infrastructure.
    compute = await create_compute()
    organization = await create_organization(users[0], compute=compute)
    solution = await create_solution(organization)
    sibling_organization = await create_organization(users[1], name="sibling", compute=compute)
    sibling_solution = await create_solution(sibling_organization)
    async with session_scope() as session:
        row = await session.get(Organization, organization.id)
        assert row is not None
        row.deleted_at = datetime.now(UTC)

        # Publish the deletion tombstone before starting external cleanup.
        await session.commit()
    calls: list[str] = []

    class Storage:
        def __init__(self, *args: object) -> None:
            """Accept registry connection settings."""

        async def delete(self, organization_id: UUID, solutions: Sequence[UUID]) -> None:
            """Record Organization bucket and identity deletion."""

            assert organization_id == organization.id
            assert list(solutions) == [solution.id]
            calls.append("bucket")

    async def delete(client: object, name: str) -> None:
        """Record compute and database namespace deletion."""

        if name == f"longlink-compute-{organization.id.hex}":
            calls.append("namespace")
        else:
            assert name == f"longlink-database-{organization.id.hex}"
            calls.append("database")

    monkeypatch.setattr(organization_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(organization_operations, "Storage", Storage)
    monkeypatch.setattr(organization_operations.utils, "delete_namespace", delete)

    # Complete cleanup and inspect irreversible resource deletion order.
    assert await organization_operations.delete(organization.id) is None
    async with session_scope() as session:
        assert await session.get(Organization, organization.id) is None
        assert await session.get(Solution, solution.id) is None
        assert await session.get(Organization, sibling_organization.id) is not None
        assert await session.get(Solution, sibling_solution.id) is not None
    assert calls == ["namespace", "database", "bucket"]


async def test_delete_retains_tombstones_and_releases_lease_after_storage_failure_then_retries(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Retain committed cleanup targets after late failure and purge them on retry."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    async with session_scope() as session:
        tombstone = await organizations.soft_delete(session, organization.id, users[0])
        deleted_at = tombstone.deleted_at
        await session.commit()
    assert deleted_at is not None
    calls: list[str] = []
    compute_namespace = f"longlink-compute-{organization.id.hex}"
    database_namespace = f"longlink-database-{organization.id.hex}"

    async def delete_namespace(client: object, name: str) -> None:
        """Accept repeat deletion of already-absent external namespaces."""

        assert name in (compute_namespace, database_namespace)
        calls.append(name)

    async def delete_storage(self: object, organization_id: UUID, solutions: Sequence[UUID]) -> None:
        """Accept bucket cleanup once its external boundary recovers."""

        assert organization_id == organization.id
        assert list(solutions) == [solution.id]
        calls.append("storage")

    async def fail_storage(self: object, organization_id: UUID, solutions: Sequence[UUID]) -> None:
        """Fail after namespace teardown under a real committed deletion lease."""

        assert organization_id == organization.id
        assert list(solutions) == [solution.id]
        assert calls == [compute_namespace, database_namespace]
        async with session_scope() as session:
            assert await session.get(OrganizationActivity, organization.id) is not None
        calls.append("storage failed")
        raise OSError("storage deletion unavailable")

    monkeypatch.setattr(organization_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(organization_operations.utils, "delete_namespace", delete_namespace)
    monkeypatch.setattr(organization_operations.Storage, "delete", delete_storage)

    # Act
    with monkeypatch.context() as provider:
        provider.setattr(organization_operations.Storage, "delete", fail_storage)
        with pytest.raises(OSError, match="storage deletion unavailable"):
            await organization_operations.delete(organization.id)

    # Assert committed tombstones survive, but the failed owner's activity does not.
    async with session_scope() as session:
        retained_organization = await session.get(Organization, organization.id)
        assert retained_organization is not None
        assert retained_organization.deleted_at == deleted_at
        retained_solution = await session.get(Solution, solution.id)
        assert retained_solution is not None
        assert retained_solution.deleted_at == deleted_at
        assert await session.get(OrganizationActivity, organization.id) is None
    assert calls == [compute_namespace, database_namespace, "storage failed"]

    # Act with the storage outage removed; bound retry admission to expose leaked leases.
    async with asyncio.timeout(5):
        await organization_operations.delete(organization.id)

    # Assert
    async with session_scope() as session:
        assert await session.get(Organization, organization.id) is None
        assert await session.get(Solution, solution.id) is None
        assert await session.get(OrganizationActivity, organization.id) is None
    assert calls == [compute_namespace, database_namespace, "storage failed", compute_namespace, database_namespace, "storage"]


async def test_delete_expires_only_open_checkouts_across_pages_before_namespaces(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Drain every open customer checkout before destructive namespace cleanup."""

    # Arrange
    organization = await create_organization(users[0])
    async with session_scope() as session:
        tombstone = await organizations.soft_delete(session, organization.id, users[0])
        tombstone.stripe_customer_id = "cus_teardown"
        await session.commit()
    monkeypatch.setattr(env, "STRIPE_SECRET_KEY", "sk_test_teardown")
    monkeypatch.setattr(env, "STRIPE_WEBHOOK_SECRET", "whsec_teardown")
    queries: list[dict[str, list[str]]] = []
    calls: list[str] = []

    async def request(
        self: stripe.HTTPXClient, method: str, url: str, headers: object, post_data: str | None = None
    ) -> tuple[bytes, int, dict[str, str]]:
        """Return two fixed Stripe pages through the real SDK's HTTP boundary."""

        # Inspect SDK filtering and continuation instead of replacing its pagination.
        parsed = urlsplit(url)
        if method == "get" and parsed.path == "/v1/checkout/sessions":
            query = parse_qs(parsed.query)
            queries.append(query)
            if "starting_after" not in query:
                data = [
                    {"id": "cs_open_first", "object": "checkout.session", "status": "open"},
                    {"id": "cs_complete", "object": "checkout.session", "status": "complete"},
                ]
                has_more = True
            else:
                assert query["starting_after"] == ["cs_complete"]
                data = [
                    {"id": "cs_open_second", "object": "checkout.session", "status": "open"},
                    {"id": "cs_expired", "object": "checkout.session", "status": "expired"},
                ]
                has_more = False
            payload = {"object": "list", "data": data, "has_more": has_more, "url": parsed.path}

        # Reject expiration of closed sessions or unrelated provider requests.
        elif method == "post" and parsed.path in (
            "/v1/checkout/sessions/cs_open_first/expire",
            "/v1/checkout/sessions/cs_open_second/expire",
        ):
            checkout_id = parsed.path.split("/")[-2]
            calls.append(checkout_id)
            payload = {"id": checkout_id, "object": "checkout.session", "status": "expired"}
        else:
            raise AssertionError(f"Unexpected Stripe request: {method} {url}")
        return json.dumps(payload).encode(), 200, {}

    async def delete_namespace(client: object, name: str) -> None:
        """Record external namespace deletion after checkout expiration."""

        calls.append(name)

    async def delete_storage(self: object, organization_id: UUID, solutions: Sequence[UUID]) -> None:
        """Accept external storage cleanup for the customer-backed Organization."""

        assert organization_id == organization.id
        assert list(solutions) == []
        calls.append("storage")

    monkeypatch.setattr(stripe.HTTPXClient, "request_async", request)
    monkeypatch.setattr(organization_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(organization_operations.utils, "delete_namespace", delete_namespace)
    monkeypatch.setattr(organization_operations.Storage, "delete", delete_storage)

    # Act
    await organization_operations.delete(organization.id)

    # Assert
    assert queries == [
        {"customer": ["cus_teardown"], "limit": ["100"]},
        {"customer": ["cus_teardown"], "limit": ["100"], "starting_after": ["cs_complete"]},
    ]
    assert calls == [
        "cs_open_first",
        "cs_open_second",
        f"longlink-compute-{organization.id.hex}",
        f"longlink-database-{organization.id.hex}",
        "storage",
    ]
    async with session_scope() as session:
        assert await session.get(Organization, organization.id) is None
        assert await session.get(OrganizationActivity, organization.id) is None
