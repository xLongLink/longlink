import pytest
import asyncio
from uuid import UUID, uuid4
from conftest import DatabasePostgres, StorageKubernetes, DatabaseKubernetes, reject_provider_construction
from factories import claim_operation, create_solution, fetch_operations, complete_operation, create_organization
from src.utils import jobs
from contextlib import asynccontextmanager
from src.utils.s3 import Credentials
from sqlalchemy.orm import selectinload
from src.kubernetes import storage
from src.operations import solutions as solution_operations
from src.utils.jobs import execute
from collections.abc import Callable, Awaitable, AsyncGenerator
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import solutions
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation
from src.database.models.organizations import Organization

pytestmark = pytest.mark.usefixtures("database_runtime")


async def create_deleted_solution(owner: User) -> tuple[Organization, Solution]:
    """Create one Solution tombstone with assigned infrastructure."""

    # Persist the complete deletion target used by Solution cleanup tests.
    organization = await create_organization(owner)
    solution = await create_solution(organization)
    async with session_scope() as session:
        await solutions.delete(session, solution.id, owner.id)
        await session.commit()

    return organization, solution


async def test_solution_delete_failure_stops_before_provider_credential_cleanup(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Retain a tombstone when Kubernetes deletion fails before provider cleanup."""

    # Arrange
    owner = users[0]
    _, solution = await create_deleted_solution(owner)
    provider_attempts: list[tuple[object, ...]] = []

    # Complete the Solution deployment operation before deletion.
    setup_operation = await claim_operation()
    assert setup_operation is not None
    assert (setup_operation.kind, setup_operation.target_id) == (OperationKind.solution_deploy, solution.desired_revision_id)
    assert await complete_operation(setup_operation.id) is True

    claimed = await claim_operation()
    assert claimed is not None
    assert claimed.target_id == solution.id

    async def delete(client: object, *_args: object) -> None:
        """Raise the Kubernetes deletion failure under test."""

        raise RuntimeError("Kubernetes workload deletion failed")

    def unexpected_provider(*args: object, **_kwargs: object) -> object:
        """Record and reject provider construction before Kubernetes deletion completes."""

        provider_attempts.append(args)
        raise AssertionError("provider cleanup ran before Kubernetes deletion completed")

    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(solution_operations.solution_resources, "delete", delete)
    monkeypatch.setattr(solution_operations.database_resources.postgres, "Postgres", unexpected_provider)

    # Act
    await execute(claimed)

    # Assert
    assert provider_attempts == []
    async with session_scope() as session:
        failed = await session.get(Operation, claimed.id)
        assert failed is not None
        assert failed.status == OperationStatus.failed
        assert failed.failed == "RuntimeError: Kubernetes workload deletion failed"
        retained = await session.get(Solution, solution.id)
    assert retained is not None
    assert retained.deleted_at is not None


async def test_solution_delete_removes_provider_state_and_tombstone(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Remove the workload, provider state, and tombstone after successful cleanup."""

    # Arrange
    organization, solution = await create_deleted_solution(users[0])
    calls: list[tuple[str, object]] = []

    async def delete(client: object, _organization_id: object, solution_id: object) -> None:
        """Record workload removal."""

        calls.append(("workload", solution_id))

    class FakePostgres(DatabasePostgres):
        """Record schema deletion."""

        async def delete_solution_schema(self, _organization_id: object, solution_id: object) -> None:
            """Record schema removal."""

            calls.append(("schema", solution_id))

    class FakeKubernetes(DatabaseKubernetes):
        """Provide the administration tunnel and observe its cleanup."""

        @asynccontextmanager
        async def forward_storage(self) -> AsyncGenerator[int, None]:
            """Release the administration tunnel before object removal."""

            try:
                yield 19000
            finally:
                calls.append(("admin_closed", solution.id))

    async def revoke(self: storage.rustfs.RustFS, solution: UUID) -> None:
        """Record credential revocation at the provider boundary."""

        calls.append(("revoke", solution))

    async def delete_prefix(self: storage.s3.S3, bucket: str, prefix: str) -> None:
        """Record solution file removal from its canonical Organization bucket."""

        assert bucket == f"longlink-{organization.id.hex}"
        calls.append(("prefix", prefix))

    monkeypatch.setattr(solution_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(solution_operations.solution_resources, "delete", delete)
    monkeypatch.setattr(solution_operations, "Storage", storage.Storage)
    monkeypatch.setattr(storage.rustfs.RustFS, "revoke", revoke)
    monkeypatch.setattr(storage.s3.S3, "delete_prefix", delete_prefix)
    monkeypatch.setattr(solution_operations.database_resources.postgres, "Postgres", FakePostgres)

    # Act
    await solution_operations.delete(solution.id)

    # Assert
    assert calls == [
        ("workload", solution.id),
        ("schema", solution.id),
        ("revoke", solution.id),
        ("admin_closed", solution.id),
        ("prefix", f"solutions/{solution.id.hex}/"),
    ]
    async with session_scope() as session:
        assert await session.get(Solution, solution.id) is None


async def test_solution_creation_applies_user_and_managed_environment_values(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Apply credentials and current infrastructure settings on initial deployment."""

    # Persist a Solution with a user-owned runtime value.
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(organization, envs={"API_KEY": "runtime-secret"})
    captured: dict[str, dict[str, str]] = {}
    database_passwords: list[str] = []
    calls: list[str] = []

    class Storage(StorageKubernetes):
        """Observe bucket resolution and authorization around persisted credentials."""

        async def service_account(self, organization: UUID, solution: UUID) -> Credentials:
            """Record credential creation after quota admission."""

            calls.append("credentials")
            return await super().service_account(organization, solution)

    class FakePostgres(DatabasePostgres):
        """Provide generated schema credentials without contacting PostgreSQL."""

        async def solution_schema(self, _organization_id: object, _solution_id: object, password: str) -> str:
            """Return the generated solution database username."""

            database_passwords.append(password)
            calls.append("schema")
            return "solution"

    class FakeKubernetes(DatabaseKubernetes):
        """Record the Kubernetes connection scope during deployment."""

        def __init__(self, kubeconfig: dict[str, object]) -> None:
            """Record client construction alongside shared fake ownership."""

            super().__init__(kubeconfig)
            calls.append("open")

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

            await super().aclose()
            calls.append("close")

    async def apply(
        client: object,
        organization_id: object,
        _solution_id: object,
        _image: object,
        secrets: dict[str, str],
        *,
        revision_id: object,
        migrate: bool,
        # Match the deployment boundary's optional private-image credential.
        registry_connection_id: UUID | None = None,
    ) -> None:
        """Capture the generated runtime environment."""

        assert organization_id == organization.id
        captured["secrets"] = secrets
        calls.append("workload")

    monkeypatch.setattr(solution_operations.database_resources.postgres, "Postgres", FakePostgres)
    monkeypatch.setattr(solution_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(solution_operations.solution_resources, "apply", apply)
    monkeypatch.setattr(solution_operations, "Storage", Storage)

    # Run the actual lifecycle handler with fake external providers.
    await solution_operations.deploy(solution.desired_revision_id)

    # User values and generated Platform values share the runtime Secret.
    assert calls == ["open", "credentials", "schema", "workload", "close"]
    calls.clear()
    assert captured["secrets"]["API_KEY"] == "runtime-secret"
    assert captured["secrets"]["LONGLINK_ENV"] == "production"
    assert captured["secrets"]["LONGLINK_DATABASE_HOST"] == f"database-rw.longlink-database-{organization.id.hex}.svc.cluster.local"
    assert captured["secrets"]["LONGLINK_DATABASE_NAME"] == organization.id.hex
    assert captured["secrets"]["LONGLINK_DATABASE_PASSWORD"] == database_passwords[0]
    assert captured["secrets"]["LONGLINK_DATABASE_PORT"] == "5432"
    assert captured["secrets"]["LONGLINK_DATABASE_USERNAME"] == "solution"
    assert captured["secrets"]["LONGLINK_DATABASE_CERTIFICATE"] == "test-database-ca"
    assert captured["secrets"]["LONGLINK_STORAGE_BUCKET"] == f"longlink-{organization.id.hex}"

    # Inspect persisted state after the runtime deployment completes.
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
    assert persisted is not None
    assert persisted.status == Status.running
    assert not {
        "LONGLINK_ENV",
        "LONGLINK_DATABASE_HOST",
        "LONGLINK_DATABASE_NAME",
        "LONGLINK_DATABASE_PORT",
        "LONGLINK_DATABASE_SCHEMA",
        "LONGLINK_STORAGE_BUCKET",
        "LONGLINK_STORAGE_PREFIX",
        "LONGLINK_STORAGE_REGION",
        "LONGLINK_DATABASE_CERTIFICATE",
        "LONGLINK_STORAGE_CERTIFICATE",
        "LONGLINK_STORAGE_ENDPOINT_URL",
    }.intersection(persisted.secrets)

    # A subsequent revision reuses all generated credentials and stable data identities.
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, owner.id)
        metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:updated"))
        await solutions.deploy(session, current, owner.id, metadata, {"API_KEY": "replacement"})
        await session.commit()
        revision_id = current.desired_revision_id
    await solution_operations.deploy(revision_id)
    assert calls == ["open", "workload", "close"]

    # Updated environment values override retained runtime credentials only where allowed.
    assert captured["secrets"] == {
        "API_KEY": "replacement",
        **persisted.secrets,
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": f"database-rw.longlink-database-{organization.id.hex}.svc.cluster.local",
        "LONGLINK_DATABASE_NAME": organization.id.hex,
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SCHEMA": solution.id.hex,
        "LONGLINK_STORAGE_BUCKET": f"longlink-{organization.id.hex}",
        "LONGLINK_STORAGE_PREFIX": f"solutions/{solution.id.hex}/",
        "LONGLINK_STORAGE_REGION": "us-east-1",
        # Database trust configuration travels with the captured runtime environment.
        "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca",
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://longlink-storage.rustfs.svc:443",
    }
    async with session_scope() as session:
        updated = await session.get(Solution, solution.id)
        assert updated is not None
        assert updated.secrets == persisted.secrets
        assert updated.deployed_revision_id == revision_id


async def test_solution_creation_preserves_schema_failure_before_storage_authorization(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Keep initial storage credentials unauthorized when SQL provisioning fails."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(organization, envs={"API_KEY": "runtime-secret"})
    initial_secrets = dict(solution.secrets)
    initial_deployed_revision_id = solution.deployed_revision_id
    initial_desired_revision_id = solution.desired_revision_id
    calls: list[str] = []

    class FailingPostgres(DatabasePostgres):
        """Fail schema provisioning after storage credentials are created."""

        async def solution_schema(self, *_args: object) -> str:
            """Fail the database provisioning step."""

            raise RuntimeError("database unavailable")

    monkeypatch.setattr(solution_operations.database_resources.postgres, "Postgres", FailingPostgres)
    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(solution_operations, "Storage", StorageKubernetes)

    async def service_account(self: StorageKubernetes, organization: UUID, solution: UUID) -> Credentials:
        """Record credential creation at the external boundary."""

        calls.append("credentials")
        return Credentials("solution", "generated-secret")

    monkeypatch.setattr(StorageKubernetes, "service_account", service_account)

    # Act and assert
    with pytest.raises(RuntimeError, match="^database unavailable$"):
        await solution_operations.deploy(solution.desired_revision_id)
    assert calls == ["credentials"]
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
        assert persisted is not None
        assert persisted.secrets == initial_secrets
        assert persisted.deployed_revision_id == initial_deployed_revision_id

        # Interrupted work cannot advance either revision pointer.
        assert persisted.desired_revision_id == initial_desired_revision_id
        assert persisted.status == Status.creating
        revision = await session.get(Revision, initial_desired_revision_id)
        assert revision is not None
        assert revision.deployed_at is None
        assert revision.envs == {"API_KEY": "runtime-secret"}


@pytest.mark.parametrize("identity", [None, "persisted-secret"], ids=["missing-identity", "running-existing-identity"])
async def test_solution_creation_retry_reuses_persisted_runtime_secrets(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, identity: str | None
) -> None:
    """Apply a retry without rotating persisted provider credentials."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, envs={"API_KEY": "runtime-secret"})
    credentials = {
        "LONGLINK_DATABASE_PASSWORD": "persisted-database-password",
        "LONGLINK_DATABASE_USERNAME": "persisted-database-user",
        "LONGLINK_STORAGE_PASSWORD": "persisted-storage-password",
        "LONGLINK_STORAGE_USERNAME": "persisted-storage-user",
    }
    if identity is not None:
        credentials["LONGLINK_IDENTITY_SECRET"] = identity
    initial_secrets = {
        **credentials,
        "LONGLINK_ENV": "production",
        "LONGLINK_STORAGE_BUCKET": organization.id.hex,
        "LONGLINK_DATABASE_HOST": "old-database.example",
        # Retained database credentials must survive a reconciliation replay.
        "LONGLINK_DATABASE_NAME": "old-database",
        "LONGLINK_DATABASE_PORT": "5433",
        "LONGLINK_DATABASE_SCHEMA": "old-schema",
        "LONGLINK_STORAGE_PREFIX": "old-prefix/",
        "LONGLINK_STORAGE_REGION": "old-region",
        "LONGLINK_DATABASE_CERTIFICATE": "old-database-ca",
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://old-storage.example",
        # Existing object-storage trust remains part of the retained runtime credentials.
        "LONGLINK_STORAGE_CERTIFICATE": "old-storage-ca",
    }
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
        assert persisted is not None
        persisted.secrets = dict(initial_secrets)
        persisted.status = Status.creating if identity is None else Status.running
        await session.commit()

    captured: list[dict[str, str]] = []

    def unexpected_provider(*_args: object, **_kwargs: object) -> object:
        """Fail if a retry attempts credential generation."""

        raise AssertionError("retry regenerated provider credentials")

    async def apply(
        client: object,
        _organization_id: object,
        _solution_id: object,
        _image: object,
        secrets: dict[str, str],
        *,
        revision_id: object,
        migrate: bool,
        # Preserve the deployment boundary's registry option.
        registry_connection_id: UUID | None = None,
    ) -> None:
        """Capture the persisted runtime environment."""

        captured.append(secrets)

    monkeypatch.setattr(solution_operations.database_resources.postgres, "Postgres", unexpected_provider)
    monkeypatch.setattr(StorageKubernetes, "service_account", unexpected_provider)

    # Control only deployment boundaries while exercising real worker transitions.
    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(solution_operations.solution_resources, "apply", apply)
    monkeypatch.setattr(solution_operations, "Storage", StorageKubernetes)

    # Act
    await solution_operations.deploy(solution.desired_revision_id)

    # Assert
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
        assert persisted is not None
        identity_secret = persisted.secrets["LONGLINK_IDENTITY_SECRET"]
        assert identity_secret
        if identity is not None:
            assert identity_secret == identity

        # Reconciliation preserves generated credentials and the existing identity secret.
        assert persisted.secrets == {**credentials, "LONGLINK_IDENTITY_SECRET": identity_secret}
        assert persisted.status == Status.running
        assert persisted.deployed_revision_id == solution.desired_revision_id
    assert captured == [
        {
            "API_KEY": "runtime-secret",
            **persisted.secrets,
            "LONGLINK_ENV": "production",
            "LONGLINK_DATABASE_HOST": f"database-rw.longlink-database-{organization.id.hex}.svc.cluster.local",
            "LONGLINK_DATABASE_NAME": organization.id.hex,
            "LONGLINK_DATABASE_PORT": "5432",
            # Reconciliation uses the stable Solution-owned database schema.
            "LONGLINK_DATABASE_SCHEMA": solution.id.hex,
            "LONGLINK_STORAGE_BUCKET": f"longlink-{organization.id.hex}",
            "LONGLINK_STORAGE_PREFIX": f"solutions/{solution.id.hex}/",
            "LONGLINK_STORAGE_REGION": "us-east-1",
            "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca",
            "LONGLINK_STORAGE_ENDPOINT_URL": "https://longlink-storage.rustfs.svc:443",
        }
    ]

    # Replay the cleaned record without regenerating provider credentials or the identity secret.
    await solution_operations.deploy(solution.desired_revision_id)
    assert len(captured) == 2
    assert captured[1] == captured[0]
    async with session_scope() as session:
        replayed = await session.get(Solution, solution.id)
        assert replayed is not None
        assert replayed.secrets == persisted.secrets


async def test_solution_creation_skips_removed_solution_provider_construction(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Treat a removed solution as an already completed lifecycle target."""

    # Arrange
    _, solution = await create_deleted_solution(users[0])
    reject_provider_construction(
        monkeypatch, (solution_operations.database_resources.postgres, "Postgres"), (solution_operations, "Kubernetes")
    )

    # Act
    result = await solution_operations.deploy(solution.desired_revision_id)

    # Assert
    assert result is None


async def test_initial_deployment_failure_does_not_schedule_recovery(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Mark a failed first release without scheduling a nonexistent fallback."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(
        organization,
        envs={"KEY": "old"},
        runtime_secrets={
            "LONGLINK_DATABASE_PASSWORD": "database-password",
            "LONGLINK_DATABASE_USERNAME": "database-user",
            "LONGLINK_STORAGE_PASSWORD": "storage-password",
            "LONGLINK_STORAGE_USERNAME": "storage-user",
            "LONGLINK_IDENTITY_SECRET": "stable",
        },
    )

    async def apply(
        client: object,
        _organization_id: UUID,
        _id: UUID,
        image: str,
        secrets: dict[str, str],
        *,
        revision_id: UUID,
        migrate: bool,
        # Keep failure injection compatible with private-image deployments.
        registry_connection_id: UUID | None = None,
    ) -> None:
        """Fail the initial Kubernetes rollout."""

        raise RuntimeError("rollout failed")

    # Run the real queue worker against the controlled rollout boundary.
    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(solution_operations.solution_resources, "apply", apply)
    initial = await claim_operation()
    assert initial is not None

    # Act
    await execute(initial)

    # Assert
    async with session_scope() as session:
        result = await session.get(Operation, initial.id)
        assert result is not None
        assert result.failed is not None
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.status == Status.failed
        assert current.deployed_revision_id is None
        assert current.desired_revision.failed

    # Terminal initial failures must not leave deployment commands pending.
    scheduled = await fetch_operations()
    assert all(operation.kind != OperationKind.solution_deploy or operation.finished_at is not None for operation in scheduled)


async def test_shutdown_keeps_deployment_resumable(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """Resume a cancelled update without marking its revision failed."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(
        organization,
        envs={"KEY": "old"},
        runtime_secrets={
            "LONGLINK_DATABASE_PASSWORD": "database-password",
            "LONGLINK_DATABASE_USERNAME": "database-user",
            "LONGLINK_STORAGE_PASSWORD": "storage-password",
            "LONGLINK_STORAGE_USERNAME": "storage-user",
            "LONGLINK_IDENTITY_SECRET": "stable",
        },
    )

    async def apply(
        client: object,
        _organization_id: UUID,
        _id: UUID,
        image: str,
        secrets: dict[str, str],
        *,
        revision_id: UUID,
        migrate: bool,
        # Keep cancellation injection compatible with the full deployment contract.
        registry_connection_id: UUID | None = None,
    ) -> None:
        """Complete the first rollout and cancel its replacement."""

        if image.endswith("@sha256:new") and migrate:
            raise asyncio.CancelledError

    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(solution_operations.solution_resources, "apply", apply)

    # Execute the initial immutable snapshot before scheduling its replacement.
    initial = await claim_operation()
    assert initial is not None
    await execute(initial)
    async with session_scope() as session:
        result = await session.get(Operation, initial.id)
        assert result is not None
        assert result.failed is None

    # The replacement image must remain distinct from the initial captured release.
    metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:new"))
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, owner.id)
        await solutions.deploy(session, current, owner.id, metadata, {"KEY": "new"})
        await session.commit()
        desired_id = current.desired_revision_id
    update = await claim_operation()
    assert update is not None

    # The queued command targets the captured desired revision, not mutable Solution state.
    assert update.target_id == desired_id

    # Act
    with pytest.raises(asyncio.CancelledError):
        await execute(update)

    # Assert
    resumed = await claim_operation()
    assert resumed is not None
    assert resumed.id == update.id
    async with session_scope() as session:
        revision = await session.get(Revision, desired_id)
        assert revision is not None
        assert not revision.failed


@pytest.mark.parametrize("failure", ["error", "timeout", "restoration", "deleted_during_rollout", "deleted_before_recovery"])
async def test_failed_update_recovery(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, failure: str) -> None:
    """Finalize timed-out rollouts before returning and recover failed updates."""

    # Arrange: use real persisted revisions and the actual worker; replace only Kubernetes.
    owner = users[0]
    organization = await create_organization(owner)
    solution = await create_solution(
        organization,
        envs={"KEY": "old"},
        runtime_secrets={
            "LONGLINK_DATABASE_PASSWORD": "database-password",
            "LONGLINK_DATABASE_USERNAME": "database-user",
            "LONGLINK_STORAGE_PASSWORD": "storage-password",
            "LONGLINK_STORAGE_USERNAME": "storage-user",
            "LONGLINK_IDENTITY_SECRET": "stable",
        },
    )
    calls: list[tuple[str, dict[str, str], bool]] = []
    rollout_finalized = asyncio.Event()
    failing = False

    async def apply(
        client: object,
        _organization_id: UUID,
        _id: UUID,
        image: str,
        secrets: dict[str, str],
        *,
        revision_id: UUID,
        migrate: bool,
        # Observe the registry option alongside the captured release.
        registry_connection_id: UUID | None = None,
    ) -> None:
        """Capture the exact snapshot and simulate rollout outcomes."""

        calls.append((image, secrets, migrate))
        if not failing:
            return

        # Delete through the real lifecycle service while rollout is suspended.
        if failure == "deleted_during_rollout":
            async with session_scope() as session:
                await solutions.delete(session, solution.id, owner.id)
                await session.commit()
        if not migrate and failure != "restoration":
            return

        # Suspend rollout until the real worker timeout cancels and finalizes it.
        if failure == "timeout":
            try:
                await asyncio.Event().wait()
            finally:
                rollout_finalized.set()
        raise RuntimeError("rollout failed")

    # Execute the real worker with deterministic rollout failure and recovery boundaries.
    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(solution_operations.solution_resources, "apply", apply)

    # Execute the initial claim before observing replacement recovery.
    initial = await claim_operation()
    assert initial is not None
    await execute(initial)

    # Read the committed worker outcome before checking deployment behavior.
    async with session_scope() as session:
        result = await session.get(Operation, initial.id)
        assert result is not None
    assert result.failed is None
    good_id = initial.target_id

    # Replace only release configuration, leaving credentials and successful identity intact.
    metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:new"))
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, owner.id)
        await solutions.deploy(session, current, owner.id, metadata, {"KEY": "new"})
        await session.commit()
        desired_id = current.desired_revision_id
    failing = True
    update = await claim_operation()

    # Replacement work targets the requested immutable revision.
    assert update is not None
    assert update.target_id == desired_id

    # Act: limit the timeout override to the failing attempt, not recovery work.
    with monkeypatch.context() as timeout:
        if failure == "timeout":
            timeout.setattr(jobs, "OPERATION_TIMEOUT_SECONDS", 0.5)
        await execute(update)

    # Assert: rollout finalization and the exact persisted timeout precede worker return.
    async with session_scope() as session:
        failed = await session.get(Operation, update.id)
        assert failed is not None
    assert failed.failed is not None
    if failure == "timeout":
        assert rollout_finalized.is_set()
        assert failed.failed == "Operation timed out after 0.5 seconds"

    # Tombstones suppress both new recovery requests and already queued recovery work.
    if failure in {"deleted_during_rollout", "deleted_before_recovery"}:
        if failure == "deleted_before_recovery":
            async with session_scope() as session:
                # Queue deletion while failed rollout recovery is still pending.
                await solutions.delete(session, solution.id, owner.id)
                await session.commit()

            # Deletion recovery must outrank obsolete deployment work.
            recovery = await claim_operation()
            assert recovery is not None
            assert recovery.kind == OperationKind.solution_deploy
            await execute(recovery)

            # Read the committed outcome for the tombstoned recovery target.
            async with session_scope() as session:
                recovered = await session.get(Operation, recovery.id)
                assert recovered is not None
                assert recovered.failed is None
        deletion = await claim_operation()
        assert deletion is not None
        assert deletion.kind == OperationKind.solution_delete

        # Finishing deletion leaves no obsolete work claimable.
        await complete_operation(deletion.id)
        assert await claim_operation() is None
        assert len(calls) == 2
        async with session_scope() as session:
            current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
            assert current is not None
            assert current.deleted_at is not None
            assert current.deployed_revision_id == good_id

            # Recovery retains the newest requested snapshot without publishing it as observed.
            assert current.desired_revision_id == desired_id
            assert current.desired_revision.failed
        return

    # Assert: failure state is committed before the queued fallback is consumed.
    async with session_scope() as session:
        persisted_solution = await session.get(Solution, solution.id)
        assert persisted_solution is not None
        assert persisted_solution.status == Status.failed
        persisted_revision = await session.get(Revision, desired_id)
        assert persisted_revision is not None
        assert persisted_revision.failed is True

    # Act: consume the exact fallback queued by the failed update.
    recovery = await claim_operation()
    assert recovery is not None
    assert (recovery.kind, recovery.target_id) == (OperationKind.solution_deploy, good_id)
    await execute(recovery)

    # Read the committed recovery outcome independently of worker execution.
    async with session_scope() as session:
        restored = await session.get(Operation, recovery.id)
        assert restored is not None
        assert (restored.failed is not None) == (failure == "restoration")

    # Failed desired/history survives successful fallback; failed fallback cannot claim running.
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.desired_revision_id == desired_id
        assert current.deployed_revision_id == good_id
        assert current.desired_revision.failed
        good = await session.get(Revision, good_id)
        assert good is not None
        assert not good.failed

        # Only failed restoration leaves the Solution unavailable.
        assert current.status == (Status.failed if failure == "restoration" else Status.running)

        # Failed replacement preserves the last working runtime credentials.
        assert current.secrets == solution.secrets
    assert calls[-1][1] == {
        "KEY": "old",
        **solution.secrets,
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": f"database-rw.longlink-database-{organization.id.hex}.svc.cluster.local",
        "LONGLINK_DATABASE_NAME": organization.id.hex,
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SCHEMA": solution.id.hex,
        "LONGLINK_STORAGE_BUCKET": f"longlink-{organization.id.hex}",
        # Generated storage credentials remain scoped to the Solution prefix.
        "LONGLINK_STORAGE_PREFIX": f"solutions/{solution.id.hex}/",
        "LONGLINK_STORAGE_REGION": "us-east-1",
        "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca",
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://longlink-storage.rustfs.svc:443",
    }
    assert calls[-1][2] is False
    assert await claim_operation() is None


async def test_queued_deployments_keep_exact_targets(users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch) -> None:
    """A newer desired revision cannot change the image or envs of queued work."""

    organization = await create_organization(users[0])
    solution = await create_solution(
        organization,
        envs={"KEY": "first"},
        runtime_secrets={
            "LONGLINK_DATABASE_PASSWORD": "database-password",
            "LONGLINK_DATABASE_USERNAME": "database-user",
            "LONGLINK_STORAGE_PASSWORD": "storage-password",
            "LONGLINK_STORAGE_USERNAME": "storage-user",
            "LONGLINK_IDENTITY_SECRET": "stable",
        },
    )
    initial = await claim_operation()
    assert initial is not None
    second = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:second"))
    third = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:third"))

    # Track revisions requested while earlier rollouts are still active.
    second_id: UUID | None = None
    third_id: UUID | None = None
    applied: list[str] = []
    expected_images = {
        "first": "ghcr.io/longlink/dashboard@sha256:test",
        "second": "ghcr.io/longlink/dashboard@sha256:second",
        "third": "ghcr.io/longlink/dashboard@sha256:third",
    }

    async def apply(
        client: object,
        _organization_id: UUID,
        _id: UUID,
        image: str,
        secrets: dict[str, str],
        *,
        revision_id: UUID,
        migrate: bool,
        # Retain the complete release boundary while recording image and environment pairs.
        registry_connection_id: UUID | None = None,
    ) -> None:
        """Capture immutable image and environment pairs."""

        nonlocal second_id, third_id
        applied.append(secrets["KEY"])
        assert image == expected_images[secrets["KEY"]]
        assert revision_id == {"first": initial.target_id, "second": second_id, "third": third_id}[secrets["KEY"]]
        if second_id is None:
            # A newer request during an active rollout must not change its captured target.
            async with session_scope() as session:
                current = await solutions.access(session, solution.id, users[0].id)
                await solutions.deploy(session, current, users[0].id, second, {"KEY": "second"})
                await session.commit()
                second_id = current.desired_revision_id
        elif third_id is None:
            # The second rollout still uses its snapshot while a third revision becomes desired.
            async with session_scope() as session:
                current = await solutions.access(session, solution.id, users[0].id)
                await solutions.deploy(session, current, users[0].id, third, {"KEY": "third"})
                await session.commit()
                third_id = current.desired_revision_id

    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)

    # Exercise queue transitions with the controlled rollout boundary.
    monkeypatch.setattr(solution_operations.solution_resources, "apply", apply)
    await execute(initial)
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.deployed_revision_id == initial.target_id
        assert current.desired_revision_id == second_id
    second_operation = await claim_operation()
    assert second_operation is not None

    # A newer desired release cannot rewrite the queued second snapshot.
    assert second_operation.target_id == second_id
    await execute(second_operation)

    # Read the committed outcome before consuming the next queued deployment.
    async with session_scope() as session:
        completed = await session.get(Operation, second_operation.id)
        assert completed is not None
        assert completed.failed is None
    third_operation = await claim_operation()
    assert third_operation is not None
    assert third_operation.target_id == third_id
    await execute(third_operation)

    # Read the final committed outcome before checking deployment order.
    async with session_scope() as session:
        completed = await session.get(Operation, third_operation.id)
        assert completed is not None
        assert completed.failed is None
    assert applied == ["first", "second", "third"]
    assert await claim_operation() is None
    async with session_scope() as session:
        # Reload the final Solution state after all captured rollouts complete.
        current = await session.get(Solution, solution.id)
        assert current is not None

        # Final reconciliation publishes the latest requested revision.
        assert current.desired_revision_id == current.deployed_revision_id == third_id


@pytest.mark.parametrize(
    "operation", [pytest.param(solution_operations.deploy, id="deployment"), pytest.param(solution_operations.delete, id="deletion")]
)
async def test_solution_lifecycle_skips_missing_target_without_constructing_providers(
    monkeypatch: pytest.MonkeyPatch, operation: Callable[[UUID], Awaitable[None]]
) -> None:
    """Treat a missing lifecycle target as an already completed operation."""

    # Arrange
    reject_provider_construction(
        monkeypatch, (solution_operations.database_resources.postgres, "Postgres"), (solution_operations, "Kubernetes")
    )

    # Act and assert
    assert await operation(uuid4()) is None


async def test_solution_creation_skips_deployment_when_deleted_before_credential_persistence(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Do not deploy credentials after the solution is deleted concurrently."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)

    class Postgres(DatabasePostgres):
        """Delete the solution after its schema credentials are generated."""

        async def solution_schema(self, *_args: object) -> str:
            """Delete the target before its runtime credentials are persisted."""

            async with session_scope() as session:
                persisted = await session.get(Solution, solution.id)
                assert persisted is not None
                await session.delete(persisted)
                await session.commit()
            return "solution"

    monkeypatch.setattr(solution_operations.database_resources.postgres, "Postgres", Postgres)

    # Replace only cluster and storage boundaries for deletion cleanup.
    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr(solution_operations, "Storage", StorageKubernetes)

    # Act
    result = await solution_operations.deploy(solution.desired_revision_id)

    # Assert
    assert result is None
