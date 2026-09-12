import pytest
from uuid import UUID, uuid4
from types import SimpleNamespace
from conftest import DatabasePostgres, StorageKubernetes, DatabaseKubernetes
from factories import (
    claim_operation,
    create_solution,
    complete_operation,
    create_organization,
    create_ready_infrastructure,
)
from src.utils.s3 import Credentials
from src.operations import solutions as solution_operations
from src.utils.jobs import execute
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import solutions
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.organizations import Organization

pytestmark = pytest.mark.usefixtures("database_runtime")


async def create_deleted_solution(owner: User) -> tuple[Organization, Solution]:
    """Create one Solution tombstone with assigned infrastructure."""

    # Persist the complete deletion target used by Solution cleanup tests.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    solution = await create_solution(organization)
    async with session_scope() as session:
        await solutions.delete(session, solution.id, owner.id)
        await session.commit()

    return organization, solution


async def test_solution_delete_failure_stops_before_provider_credential_cleanup(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Retain a tombstone when Kubernetes deletion fails before provider cleanup."""

    # Arrange
    owner = users[0]
    organization, solution = await create_deleted_solution(owner)
    provider_attempts: list[tuple[object, ...]] = []

    # Complete the known Organization and Solution creation operations before deletion.
    for kind, target_id in (
        (OperationKind.organization_create, organization.id),
        (OperationKind.solution_deploy, solution.desired_revision_id),
    ):
        setup_operation = await claim_operation()
        assert setup_operation is not None
        assert (setup_operation.kind, setup_operation.target_id) == (kind, target_id)
        assert await complete_operation(setup_operation.id) is not None

    claimed = await claim_operation()
    assert claimed is not None
    assert claimed.target_id == solution.id

    class FailingKubernetes:
        """Expose the failing Solution workload client."""

        def __init__(self, _kubeconfig: str) -> None:
            """Initialize the fake Kubernetes client."""

            self.solutions = self
            self.databases = DatabaseKubernetes()
            self.storage = self.databases.storage

        async def delete(self, *_args: object) -> None:
            """Raise the Kubernetes deletion failure under test."""

            raise RuntimeError("Kubernetes workload deletion failed")

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    def unexpected_provider(*args: object) -> object:
        """Record and reject provider construction before Kubernetes deletion completes."""

        provider_attempts.append(args)
        raise AssertionError("provider cleanup ran before Kubernetes deletion completed")

    monkeypatch.setattr(solution_operations, "Kubernetes", FailingKubernetes)
    monkeypatch.setattr(DatabasePostgres, "delete_solution_schema", unexpected_provider, raising=False)

    # Act
    failed = await execute(claimed)

    # Assert
    assert provider_attempts == []
    assert failed.status == OperationStatus.failed
    assert failed.failed == "RuntimeError: Kubernetes workload deletion failed"
    async with session_scope() as session:
        retained = await session.get(Solution, solution.id)
    assert retained is not None
    assert retained.deleted_at is not None


async def test_solution_delete_removes_provider_state_and_tombstone(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Remove the workload, provider state, and tombstone after successful cleanup."""

    # Arrange
    _, solution = await create_deleted_solution(users[0])
    calls: list[tuple[str, object]] = []

    class FakeKubernetes:
        """Record workload deletion."""

        def __init__(self, _kubeconfig: str) -> None:
            """Expose the solution lifecycle client."""

            self.solutions = self
            self.databases = DatabaseKubernetes()
            self.storage = FakeStorage()

        async def delete(self, solution_id: object, _organization_id: object) -> None:
            """Record workload removal."""

            calls.append(("workload", solution_id))

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    class FakePostgres(DatabasePostgres):
        """Record schema deletion."""

        async def delete_solution_schema(self, _organization_id: object, solution_id: object) -> None:
            """Record schema removal."""

            calls.append(("schema", solution_id))

    class FakeStorage(StorageKubernetes):
        """Record object-storage cleanup."""

        def __init__(self, *_args: object) -> None:
            """Accept provider configuration."""

        async def revoke(self, solution_id: object) -> None:
            """Record credential revocation."""

            calls.append(("revoke", solution_id))

        async def delete_prefix(self, _bucket: str, prefix: str) -> None:
            """Record solution file removal."""

            calls.append(("prefix", prefix))

    monkeypatch.setattr(solution_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(solution_operations.databases.postgres, "Postgres", FakePostgres)

    # Act
    await solution_operations.delete(solution.id)

    # Assert
    assert calls == [
        ("workload", solution.id),
        ("schema", solution.id),
        ("revoke", solution.id),
        ("prefix", f"solutions/{solution.id.hex}/"),
    ]
    async with session_scope() as session:
        assert await session.get(Solution, solution.id) is None


async def test_solution_creation_applies_user_and_managed_environment_values(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Apply the complete persisted runtime environment on initial deployment."""

    # Persist a Solution with a user-owned runtime value.
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    solution = await create_solution(organization, secrets={"API_KEY": "runtime-secret"})
    captured: dict[str, dict[str, str]] = {}
    database_passwords: list[str] = []
    calls: list[str] = []

    class Storage(StorageKubernetes):
        """Observe quota admission and authorization around persisted credentials."""

        async def quota(self, organization: UUID, compute: object) -> None:
            """Record acknowledged quota admission."""

            calls.append("quota")

        async def bucket(self, organization: UUID, compute: object) -> SimpleNamespace:
            """Record the owner connection resolution."""

            calls.append("bucket")
            return await super().bucket(organization, compute)

        async def user(self, solution: UUID, organization: UUID) -> Credentials:
            """Record credential creation after quota admission."""

            calls.append("credentials")
            return await super().user(solution, organization)

        async def authorize(self, bucket: str, solutions: object) -> None:
            """Require committed credentials before enabling the storage principal."""

            async with session_scope() as session:
                persisted = await session.get(Solution, solution.id)
                assert persisted is not None
                assert persisted.secrets["LONGLINK_DATABASE_PASSWORD"] == database_passwords[0]
                assert persisted.secrets["LONGLINK_IDENTITY_SECRET"]
                assert persisted.deployed_revision_id != persisted.desired_revision_id
            calls.append("authorize")

    class FakePostgres(DatabasePostgres):
        """Provide generated schema credentials without contacting PostgreSQL."""

        async def solution_schema(self, _organization_id: object, _solution_id: object, password: str) -> str:
            """Return the generated solution database username."""

            database_passwords.append(password)
            calls.append("schema")
            return "solution"

    class FakeKubernetes:
        """Capture the Kubernetes Secret submitted during deployment."""

        def __init__(self, *_args: object) -> None:
            """Expose the solution lifecycle client."""

            self.solutions = self
            self.databases = DatabaseKubernetes()
            self.storage = Storage()
            calls.append("open")

        async def apply(
            self,
            _solution_id: object,
            _namespace: object,
            _image: object,
            secrets: dict[str, str],
            *,
            revision_id: object,
            min_scale: int,
            migrate: bool,
        ) -> None:
            """Capture the generated runtime environment."""

            assert _namespace == f"longlink-compute-{organization.id.hex}"
            captured["secrets"] = secrets
            calls.append("workload")

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

            calls.append("close")

    monkeypatch.setattr(solution_operations.databases.postgres, "Postgres", FakePostgres)
    monkeypatch.setattr(solution_operations, "Kubernetes", FakeKubernetes)

    # Run the actual lifecycle handler with fake external providers.
    await solution_operations.deploy(solution.desired_revision_id)

    # User values and generated Platform values share the runtime Secret.
    assert calls == ["open", "quota", "bucket", "credentials", "schema", "authorize", "workload", "close"]
    calls.clear()
    assert captured["secrets"]["API_KEY"] == "runtime-secret"
    assert captured["secrets"]["LONGLINK_DATABASE_HOST"] == f"database-rw.longlink-database-{organization.id.hex}.svc.cluster.local"
    assert captured["secrets"]["LONGLINK_DATABASE_NAME"] == organization.id.hex
    assert captured["secrets"]["LONGLINK_DATABASE_PASSWORD"] == database_passwords[0]
    assert captured["secrets"]["LONGLINK_DATABASE_PORT"] == "5432"
    assert captured["secrets"]["LONGLINK_DATABASE_SSLMODE"] == "require"
    assert captured["secrets"]["LONGLINK_DATABASE_USERNAME"] == "solution"
    assert captured["secrets"]["LONGLINK_DATABASE_CERTIFICATE"] == "test-database-ca"
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
    assert persisted is not None
    assert persisted.status == Status.running

    # A subsequent revision reuses all generated credentials and stable data identities.
    async with session_scope() as session:
        current = await solutions.access(session, solution.id, owner.id)
        metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:updated"))
        await solutions.deploy(session, current, owner.id, metadata, {"API_KEY": "replacement"})
        await session.commit()
        revision_id = current.desired_revision_id
    await solution_operations.deploy(revision_id)
    assert calls == ["open", "quota", "bucket", "authorize", "workload", "close"]
    assert len(database_passwords) == 1
    assert captured["secrets"] == {"API_KEY": "replacement", **persisted.secrets, "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca"}
    async with session_scope() as session:
        updated = await session.get(Solution, solution.id)
        assert updated is not None
        assert updated.secrets == persisted.secrets
        assert updated.deployed_revision_id == revision_id


async def test_solution_creation_preserves_schema_failure_before_storage_authorization(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Keep initial storage credentials unauthorized when SQL provisioning fails."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    solution = await create_solution(organization, secrets={"API_KEY": "runtime-secret"})
    initial_secrets = dict(solution.secrets)
    initial_deployed_revision_id = solution.deployed_revision_id
    initial_desired_revision_id = solution.desired_revision_id
    calls: list[str] = []

    class FailingPostgres(DatabasePostgres):
        """Fail schema provisioning after storage credentials are created."""

        async def solution_schema(self, *_args: object) -> str:
            """Fail the database provisioning step."""

            raise RuntimeError("database unavailable")

    monkeypatch.setattr(solution_operations.databases.postgres, "Postgres", FailingPostgres)
    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)

    async def user(self: StorageKubernetes, solution_id: UUID, organization_id: UUID) -> Credentials:
        """Record credential creation at the external boundary."""

        calls.append("credentials")
        return Credentials("solution", "generated-secret")

    monkeypatch.setattr(StorageKubernetes, "user", user)

    async def authorize(self: StorageKubernetes, bucket: str, solutions: object) -> None:
        """Record and reject authorization after failed SQL provisioning."""

        calls.append("authorize")
        raise AssertionError("storage authorization ran after SQL provisioning failed")

    monkeypatch.setattr(StorageKubernetes, "authorize", authorize)

    # Act and assert
    with pytest.raises(RuntimeError, match="^database unavailable$"):
        await solution_operations.deploy(solution.desired_revision_id)
    assert calls == ["credentials"]
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
        assert persisted is not None
        assert persisted.secrets == initial_secrets
        assert persisted.deployed_revision_id == initial_deployed_revision_id
        assert persisted.desired_revision_id == initial_desired_revision_id
        assert persisted.status == Status.creating
        revision = await session.get(Revision, initial_desired_revision_id)
        assert revision is not None
        assert revision.deployed_at is None
        assert revision.envs == {"API_KEY": "runtime-secret"}


@pytest.mark.parametrize("identity", [None, "persisted-secret"], ids=["missing-identity", "running-existing-identity"])
async def test_solution_creation_retry_reuses_persisted_runtime_secrets(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    identity: str | None,
) -> None:
    """Apply a retry without rotating persisted provider credentials."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    solution = await create_solution(
        organization,
        secrets={"API_KEY": "runtime-secret"},
    )
    initial_secrets = {
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": f"database-rw.longlink-database-{organization.id.hex}.svc.cluster.local",
        "LONGLINK_DATABASE_NAME": organization.id.hex,
        "LONGLINK_DATABASE_PASSWORD": "persisted-database-password",
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SCHEMA": solution.id.hex,
        "LONGLINK_DATABASE_SSLMODE": "require",
        "LONGLINK_DATABASE_USERNAME": "persisted-database-user",
        "LONGLINK_STORAGE_BUCKET": organization.id.hex,
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://storage.example",
        "LONGLINK_STORAGE_PASSWORD": "persisted-storage-password",
        "LONGLINK_STORAGE_PREFIX": f"solutions/{solution.id.hex}/",
        "LONGLINK_STORAGE_REGION": "us-east-1",
        "LONGLINK_STORAGE_USERNAME": "persisted-storage-user",
    }
    if identity is not None:
        initial_secrets["LONGLINK_IDENTITY_SECRET"] = identity
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
        assert persisted is not None
        persisted.secrets = dict(initial_secrets)
        persisted.status = Status.creating if identity is None else Status.running
        await session.commit()
    captured: list[dict[str, str]] = []

    def unexpected_provider(*_args: object) -> object:
        """Fail if a retry attempts credential generation."""

        raise AssertionError("retry regenerated provider credentials")

    class FakeKubernetes:
        """Capture the retry workload environment."""

        def __init__(self, *_args: object) -> None:
            """Expose the solution lifecycle client."""

            self.solutions = self
            self.databases = DatabaseKubernetes()
            self.storage = self.databases.storage

        async def apply(
            self,
            _solution_id: object,
            _namespace: object,
            _image: object,
            secrets: dict[str, str],
            *,
            revision_id: object,
            min_scale: int,
            migrate: bool,
        ) -> None:
            """Capture the persisted runtime environment."""

            captured.append(secrets)

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    monkeypatch.setattr(DatabasePostgres, "solution_schema", unexpected_provider, raising=False)
    monkeypatch.setattr(StorageKubernetes, "user", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Kubernetes", FakeKubernetes)

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
        assert persisted.secrets == {**initial_secrets, "LONGLINK_IDENTITY_SECRET": identity_secret}
        assert persisted.status == Status.running
        assert persisted.deployed_revision_id == solution.desired_revision_id
    assert captured == [
        {
            "API_KEY": "runtime-secret",
            **initial_secrets,
            "LONGLINK_IDENTITY_SECRET": identity_secret,
            "LONGLINK_DATABASE_CERTIFICATE": "test-database-ca",
        }
    ]


async def test_solution_creation_skips_removed_solution_provider_construction(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Treat a removed solution as an already completed lifecycle target."""

    # Arrange
    _, solution = await create_deleted_solution(users[0])

    def unexpected_provider(*_args: object) -> object:
        """Reject provider construction for a removed solution."""

        raise AssertionError("providers must not be constructed")

    monkeypatch.setattr(solution_operations.databases.postgres, "Postgres", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Kubernetes", unexpected_provider)

    # Act
    result = await solution_operations.deploy(solution.desired_revision_id)

    # Assert
    assert result is None


async def test_solution_creation_skips_missing_solution_without_constructing_providers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Treat a missing Solution as an already completed lifecycle target."""

    # Arrange
    def unexpected_provider(*_args: object) -> object:
        """Reject provider construction for an absent target."""

        raise AssertionError("providers must not be constructed")

    monkeypatch.setattr(solution_operations.databases.postgres, "Postgres", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Kubernetes", unexpected_provider)

    # Act and assert
    assert await solution_operations.deploy(uuid4()) is None


async def test_solution_creation_skips_deployment_when_deleted_before_credential_persistence(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Do not deploy credentials after the solution is deleted concurrently."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
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

    monkeypatch.setattr(solution_operations.databases.postgres, "Postgres", Postgres)
    monkeypatch.setattr(solution_operations, "Kubernetes", DatabaseKubernetes)

    # Act
    result = await solution_operations.deploy(solution.desired_revision_id)

    # Assert
    assert result is None


async def test_solution_deletion_skips_missing_solution_without_constructing_providers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Treat a missing Solution tombstone as completed cleanup."""

    # Arrange
    def unexpected_provider(*_args: object) -> object:
        """Reject provider construction for an absent cleanup target."""

        raise AssertionError("providers must not be constructed")

    monkeypatch.setattr(solution_operations.databases.postgres, "Postgres", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Kubernetes", unexpected_provider)

    # Act and assert
    assert await solution_operations.delete(uuid4()) is None
