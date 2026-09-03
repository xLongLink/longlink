import pytest
from uuid import uuid4
from factories import (
    claim_operation,
    create_solution,
    complete_operation,
    create_organization,
    create_ready_infrastructure,
)
from src.operations import solutions as solution_operations
from src.utils.jobs import execute
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import solutions
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


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

    # Queue deletion for a Solution with real persisted infrastructure assignments.
    owner = users[0]
    organization, solution = await create_deleted_solution(owner)

    # Complete the known Organization and Solution creation operations before deletion.
    for kind, target_id in (
        (OperationKind.organization_create, organization.id),
        (OperationKind.solution_create, solution.id),
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

        async def delete(self, *_args: object) -> None:
            """Raise the Kubernetes deletion failure under test."""

            raise RuntimeError("Kubernetes workload deletion failed")

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    def unexpected_provider(*_args: object) -> object:
        """Fail if provider cleanup runs before Kubernetes deletion completes."""

        raise AssertionError("provider cleanup ran before Kubernetes deletion completed")

    monkeypatch.setattr(solution_operations, "Kubernetes", FailingKubernetes)
    monkeypatch.setattr(solution_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Exoscale", unexpected_provider)

    # Execute the real worker transition around the failing deletion handler.
    failed = await execute(claimed)

    # The failed operation retains its tombstone and never reaches provider cleanup.
    assert failed.status == OperationStatus.failed
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

        async def delete(self, solution_id: object, _organization_id: object) -> None:
            """Record workload removal."""

            calls.append(("workload", solution_id))

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    class FakePostgres:
        """Record schema deletion."""

        def __init__(self, *_args: object) -> None:
            """Accept provider configuration."""

        async def delete_solution_schema(self, _organization_id: object, solution_id: object) -> None:
            """Record schema removal."""

            calls.append(("schema", solution_id))

    class FakeStorage:
        """Record object-storage cleanup."""

        def __init__(self, *_args: object) -> None:
            """Accept provider configuration."""

        async def revoke_solution(self, solution_id: str) -> None:
            """Record credential revocation."""

            calls.append(("revoke", solution_id))

        async def delete_prefix(self, _bucket: str, prefix: str) -> None:
            """Record solution file removal."""

            calls.append(("prefix", prefix))

    monkeypatch.setattr(solution_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(solution_operations, "Postgres", FakePostgres)
    monkeypatch.setattr(solution_operations, "Exoscale", FakeStorage)

    # Act
    await solution_operations.delete(solution.id)

    # Assert
    assert calls == [
        ("workload", solution.id),
        ("schema", solution.id),
        ("revoke", solution.id.hex),
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

    class FakePostgres:
        """Provide generated schema credentials without contacting PostgreSQL."""

        def __init__(self, *_args: object) -> None:
            """Accept the configured registry connection values."""

        async def solution_schema(self, _organization_id: object, _solution_id: object, password: str) -> str:
            """Return the generated solution database username."""

            database_passwords.append(password)
            return "solution"

    class FakeStorage:
        """Provide generated object-storage credentials without contacting storage."""

        region = "ch-gva-2"

        def __init__(self, *_args: object) -> None:
            """Accept the configured registry connection values."""

        async def solution_credentials(self, *_args: object) -> dict[str, str]:
            """Return solution-scoped object-storage credentials."""

            return {"access_key_id": "solution", "secret_access_key": "generated-secret"}

    class FakeKubernetes:
        """Capture the Kubernetes Secret submitted during deployment."""

        def __init__(self, *_args: object) -> None:
            """Expose the solution lifecycle client."""

            self.solutions = self

        async def apply(self, _solution_id: object, _namespace: object, _image: object, secrets: dict[str, str]) -> None:
            """Capture the generated runtime environment."""

            captured["secrets"] = secrets

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    monkeypatch.setattr(solution_operations, "Postgres", FakePostgres)
    monkeypatch.setattr(solution_operations, "Exoscale", FakeStorage)
    monkeypatch.setattr(solution_operations, "Kubernetes", FakeKubernetes)

    # Run the actual lifecycle handler with fake external providers.
    await solution_operations.create(solution.id)

    # User values and generated Platform values share the runtime Secret.
    assert captured["secrets"]["API_KEY"] == "runtime-secret"
    assert captured["secrets"]["LONGLINK_DATABASE_HOST"] == infrastructure.database.host
    assert captured["secrets"]["LONGLINK_DATABASE_NAME"] == organization.id.hex
    assert captured["secrets"]["LONGLINK_DATABASE_PASSWORD"] == database_passwords[0]
    assert captured["secrets"]["LONGLINK_DATABASE_PORT"] == str(infrastructure.database.port)
    assert captured["secrets"]["LONGLINK_DATABASE_SSLMODE"] == infrastructure.database.sslmode.value
    assert captured["secrets"]["LONGLINK_DATABASE_USERNAME"] == "solution"
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
    assert persisted is not None
    assert persisted.status == Status.running


@pytest.mark.parametrize("revoke_error", [None, RuntimeError("revoke failed")], ids=["success", "failure"])
async def test_solution_creation_preserves_schema_failure_during_credential_compensation(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    revoke_error: RuntimeError | None,
) -> None:
    """Preserve schema failure while compensating generated storage credentials."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    solution = await create_solution(organization)
    calls: list[str] = []

    class FailingPostgres:
        """Fail schema provisioning after storage credentials are created."""

        def __init__(self, *_args: object) -> None:
            """Accept the configured registry connection values."""

        async def solution_schema(self, *_args: object) -> str:
            """Fail the database provisioning step."""

            raise RuntimeError("database unavailable")

    class FakeStorage:
        """Record generated credential cleanup."""

        def __init__(self, *_args: object) -> None:
            """Accept the configured registry connection values."""

        async def solution_credentials(self, _name: str, _bucket: str, _prefix: str) -> dict[str, str]:
            """Issue one solution-scoped credential."""

            calls.append("credentials")
            return {"access_key_id": "solution", "secret_access_key": "generated-secret"}

        async def revoke_solution(self, name: str) -> None:
            """Record credential revocation and optionally fail compensation."""

            assert name == solution.id.hex
            calls.append("revoke")
            if revoke_error is not None:
                raise revoke_error

    monkeypatch.setattr(solution_operations, "Postgres", FailingPostgres)
    monkeypatch.setattr(solution_operations, "Exoscale", FakeStorage)

    # Act and assert
    with pytest.raises(RuntimeError, match="database unavailable"):
        await solution_operations.create(solution.id)
    assert calls == ["credentials", "revoke"]


async def test_solution_creation_retry_reuses_persisted_runtime_secrets(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Apply a retry without rotating persisted provider credentials."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    solution = await create_solution(
        organization,
        secrets={"API_KEY": "runtime-secret", "LONGLINK_ENV": "production"},
    )
    captured: dict[str, dict[str, str]] = {}

    def unexpected_provider(*_args: object) -> object:
        """Fail if a retry attempts credential generation."""

        raise AssertionError("retry regenerated provider credentials")

    class FakeKubernetes:
        """Capture the retry workload environment."""

        def __init__(self, *_args: object) -> None:
            """Expose the solution lifecycle client."""

            self.solutions = self

        async def apply(self, _solution_id: object, _namespace: object, _image: object, secrets: dict[str, str]) -> None:
            """Capture the persisted runtime environment."""

            captured["secrets"] = secrets

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    monkeypatch.setattr(solution_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Kubernetes", FakeKubernetes)

    # Act
    await solution_operations.create(solution.id)

    # Assert
    assert captured["secrets"]["API_KEY"] == "runtime-secret"
    assert captured["secrets"]["LONGLINK_ENV"] == "production"
    assert captured["secrets"]["LONGLINK_IDENTITY_SECRET"]


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

    monkeypatch.setattr(solution_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Kubernetes", unexpected_provider)

    # Act
    result = await solution_operations.create(solution.id)

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

    monkeypatch.setattr(solution_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Kubernetes", unexpected_provider)

    # Act and assert
    assert await solution_operations.create(uuid4()) is None


async def test_solution_creation_reuses_complete_runtime_secrets_for_running_solution(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Apply running Solutions without rotating their complete runtime contract."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    solution = await create_solution(
        organization,
        secrets={"LONGLINK_ENV": "production", "LONGLINK_IDENTITY_SECRET": "persisted-secret"},
    )
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
        assert persisted is not None
        persisted.status = Status.running
        await session.commit()
    applied: list[dict[str, str]] = []

    class Kubernetes:
        """Capture Solution reconciliation without contacting Kubernetes."""

        def __init__(self, *_args: object) -> None:
            """Expose the Solution lifecycle client."""

            self.solutions = self

        async def apply(self, _solution_id: object, _namespace: object, _image: object, secrets: dict[str, str]) -> None:
            """Capture the persisted runtime contract."""

            applied.append(secrets)

        async def aclose(self) -> None:
            """Provide the Kubernetes client cleanup contract."""

    monkeypatch.setattr(solution_operations, "Kubernetes", Kubernetes)

    # Act
    await solution_operations.create(solution.id)

    # Assert
    assert applied == [solution.secrets]
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
    assert persisted is not None
    assert persisted.status == Status.running
    assert persisted.secrets["LONGLINK_IDENTITY_SECRET"] == "persisted-secret"


async def test_solution_creation_skips_deployment_when_deleted_before_credential_persistence(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Do not deploy credentials after the solution is deleted concurrently."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    solution = await create_solution(organization)

    class Postgres:
        """Delete the solution after its schema credentials are generated."""

        def __init__(self, *_args: object) -> None:
            """Accept the configured database connection values."""

        async def solution_schema(self, *_args: object) -> str:
            """Delete the target before its runtime credentials are persisted."""

            async with session_scope() as session:
                persisted = await session.get(Solution, solution.id)
                assert persisted is not None
                await session.delete(persisted)
                await session.commit()
            return "solution"

    class Storage:
        """Provide object-storage credentials without contacting storage."""

        region = "ch-gva-2"

        def __init__(self, *_args: object) -> None:
            """Accept the configured storage connection values."""

        async def solution_credentials(self, *_args: object) -> dict[str, str]:
            """Return solution-scoped object-storage credentials."""

            return {"access_key_id": "solution", "secret_access_key": "generated-secret"}

    def unexpected_kubernetes(*_args: object) -> object:
        """Reject deployment after the concurrent deletion."""

        raise AssertionError("deleted solution must not be deployed")

    monkeypatch.setattr(solution_operations, "Postgres", Postgres)
    monkeypatch.setattr(solution_operations, "Exoscale", Storage)
    monkeypatch.setattr(solution_operations, "Kubernetes", unexpected_kubernetes)

    # Act
    result = await solution_operations.create(solution.id)

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

    monkeypatch.setattr(solution_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(solution_operations, "Kubernetes", unexpected_provider)

    # Act and assert
    assert await solution_operations.delete(uuid4()) is None
