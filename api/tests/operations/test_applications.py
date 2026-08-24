import pytest
from uuid import uuid4
from factories import (
    claim_operation,
    complete_operation,
    create_application,
    create_organization,
    create_ready_infrastructure,
)
from src.operations import applications as application_operations
from src.utils.jobs import execute
from src.models.types import DatabaseSSLMode
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import applications
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User
from src.database.models.applications import Application
from src.database.models.organizations import Organization


async def create_deleted_application(owner: User) -> tuple[Organization, Application]:
    """Create one Application tombstone with assigned infrastructure."""

    # Persist the complete deletion target used by Application cleanup tests.
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    application = await create_application(organization)
    async with session_scope() as session:
        await applications.delete(session, application.id, owner.id)
        await session.commit()

    return organization, application


async def test_application_delete_failure_stops_before_provider_credential_cleanup(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Retain a tombstone when Kubernetes deletion fails before provider cleanup."""

    # Queue deletion for an Application with real persisted infrastructure assignments.
    owner = users[0]
    organization, application = await create_deleted_application(owner)

    # Complete the known Organization and Application creation operations before deletion.
    for kind, target_id in (
        (OperationKind.organization_create, organization.id),
        (OperationKind.application_create, application.id),
    ):
        setup_operation = await claim_operation()
        assert setup_operation is not None
        assert (setup_operation.kind, setup_operation.target_id) == (kind, target_id)
        assert await complete_operation(setup_operation.id) is not None

    claimed = await claim_operation()
    assert claimed is not None
    assert claimed.target_id == application.id

    class FailingKubernetes:
        """Expose the failing Application workload client."""

        def __init__(self, _kubeconfig: str) -> None:
            """Initialize the fake Kubernetes client."""

            self.applications = self

        async def delete(self, *_args: object) -> None:
            """Raise the Kubernetes deletion failure under test."""

            raise RuntimeError("Kubernetes workload deletion failed")

    def unexpected_provider(*_args: object) -> object:
        """Fail if provider cleanup runs before Kubernetes deletion completes."""

        raise AssertionError("provider cleanup ran before Kubernetes deletion completed")

    monkeypatch.setattr(application_operations, "Kubernetes", FailingKubernetes)
    monkeypatch.setattr(application_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(application_operations, "Exoscale", unexpected_provider)

    # Execute the real worker transition around the failing deletion handler.
    failed = await execute(claimed)

    # The failed operation retains its tombstone and never reaches provider cleanup.
    assert failed.status == OperationStatus.failed
    async with session_scope() as session:
        retained = await session.get(Application, application.id)
    assert retained is not None
    assert retained.deleted_at is not None


async def test_application_delete_removes_provider_state_and_tombstone(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Remove the workload, provider state, and tombstone after successful cleanup."""

    # Arrange
    _, application = await create_deleted_application(users[0])
    calls: list[tuple[str, object]] = []

    class FakeKubernetes:
        """Record workload deletion."""

        def __init__(self, _kubeconfig: str) -> None:
            """Expose the application lifecycle client."""

            self.applications = self

        async def delete(self, application_id: object, _organization_id: object) -> None:
            """Record workload removal."""

            calls.append(("workload", application_id))

    class FakePostgres:
        """Record schema deletion."""

        def __init__(self, *_args: object) -> None:
            """Accept provider configuration."""

        async def delete_schema(self, _organization_id: object, application_id: object) -> None:
            """Record schema removal."""

            calls.append(("schema", application_id))

    class FakeStorage:
        """Record object-storage cleanup."""

        def __init__(self, *_args: object) -> None:
            """Accept provider configuration."""

        async def revoke(self, application_id: str) -> None:
            """Record credential revocation."""

            calls.append(("revoke", application_id))

        async def delete_prefix(self, _bucket: str, prefix: str) -> None:
            """Record application file removal."""

            calls.append(("prefix", prefix))

    monkeypatch.setattr(application_operations, "Kubernetes", FakeKubernetes)
    monkeypatch.setattr(application_operations, "Postgres", FakePostgres)
    monkeypatch.setattr(application_operations, "Exoscale", FakeStorage)

    # Act
    await application_operations.delete(application.id)

    # Assert
    assert calls == [
        ("workload", application.id),
        ("schema", application.id),
        ("revoke", application.id.hex),
        ("prefix", f"applications/{application.id.hex}/"),
    ]
    async with session_scope() as session:
        assert await session.get(Application, application.id) is None


async def test_application_creation_applies_user_and_managed_environment_values(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Apply the complete persisted runtime environment on initial deployment."""

    # Persist an Application with a user-owned runtime value.
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    application = await create_application(organization, secrets={"API_KEY": "runtime-secret"})
    captured: dict[str, dict[str, str]] = {}

    class FakePostgres:
        """Provide generated schema credentials without contacting PostgreSQL."""

        def __init__(self, *_args: object) -> None:
            """Accept the configured registry connection values."""

        async def schema(self, *_args: object) -> dict[str, object]:
            """Return the generated application schema credentials."""

            return {
                "host": "database.example",
                "database_name": "organization",
                "password": "generated-password",
                "port": 5432,
                "sslmode": DatabaseSSLMode.disable,
                "username": "application",
            }

    class FakeStorage:
        """Provide generated object-storage credentials without contacting storage."""

        region = "ch-gva-2"

        def __init__(self, *_args: object) -> None:
            """Accept the configured registry connection values."""

        async def credentials(self, *_args: object) -> dict[str, str]:
            """Return application-scoped object-storage credentials."""

            return {"access_key_id": "application", "secret_access_key": "generated-secret"}

    class FakeKubernetes:
        """Capture the Kubernetes Secret submitted during deployment."""

        def __init__(self, *_args: object) -> None:
            """Expose the application lifecycle client."""

            self.applications = self

        async def apply(self, _application_id: object, _namespace: object, _image: object, secrets: dict[str, str]) -> None:
            """Capture the generated runtime environment."""

            captured["secrets"] = secrets

    monkeypatch.setattr(application_operations, "Postgres", FakePostgres)
    monkeypatch.setattr(application_operations, "Exoscale", FakeStorage)
    monkeypatch.setattr(application_operations, "Kubernetes", FakeKubernetes)

    # Run the actual lifecycle handler with fake external providers.
    await application_operations.create(application.id)

    # User values and generated Platform values share the runtime Secret.
    assert captured["secrets"]["API_KEY"] == "runtime-secret"
    assert captured["secrets"]["LONGLINK_DATABASE_PASSWORD"] == "generated-password"
    async with session_scope() as session:
        persisted = await session.get(Application, application.id)
    assert persisted is not None
    assert persisted.status == Status.running


async def test_application_creation_retry_reuses_persisted_runtime_secrets(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Apply a retry without rotating persisted provider credentials."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    application = await create_application(
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
            """Expose the application lifecycle client."""

            self.applications = self

        async def apply(self, _application_id: object, _namespace: object, _image: object, secrets: dict[str, str]) -> None:
            """Capture the persisted runtime environment."""

            captured["secrets"] = secrets

    monkeypatch.setattr(application_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(application_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(application_operations, "Kubernetes", FakeKubernetes)

    # Act
    await application_operations.create(application.id)

    # Assert
    assert captured["secrets"]["API_KEY"] == "runtime-secret"
    assert captured["secrets"]["LONGLINK_ENV"] == "production"
    assert captured["secrets"]["LONGLINK_IDENTITY_SECRET"]


async def test_application_creation_skips_removed_application_provider_construction(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Treat a removed application as an already completed lifecycle target."""

    # Arrange
    _, application = await create_deleted_application(users[0])

    def unexpected_provider(*_args: object) -> object:
        """Reject provider construction for a removed application."""

        raise AssertionError("providers must not be constructed")

    monkeypatch.setattr(application_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(application_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(application_operations, "Kubernetes", unexpected_provider)

    # Act
    result = await application_operations.create(application.id)

    # Assert
    assert result is None


async def test_application_creation_skips_missing_application_without_constructing_providers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Treat a missing Application as an already completed lifecycle target."""

    # Arrange
    def unexpected_provider(*_args: object) -> object:
        """Reject provider construction for an absent target."""

        raise AssertionError("providers must not be constructed")

    monkeypatch.setattr(application_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(application_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(application_operations, "Kubernetes", unexpected_provider)

    # Act and assert
    assert await application_operations.create(uuid4()) is None


async def test_application_creation_reuses_complete_runtime_secrets_for_running_application(
    users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Apply running Applications without rotating their complete runtime contract."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    application = await create_application(
        organization,
        secrets={"LONGLINK_ENV": "production", "LONGLINK_IDENTITY_SECRET": "persisted-secret"},
    )
    async with session_scope() as session:
        persisted = await session.get(Application, application.id)
        assert persisted is not None
        persisted.status = Status.running
        await session.commit()
    applied: list[dict[str, str]] = []

    class Kubernetes:
        """Capture Application reconciliation without contacting Kubernetes."""

        def __init__(self, *_args: object) -> None:
            """Expose the Application lifecycle client."""

            self.applications = self

        async def apply(self, _application_id: object, _namespace: object, _image: object, secrets: dict[str, str]) -> None:
            """Capture the persisted runtime contract."""

            applied.append(secrets)

    monkeypatch.setattr(application_operations, "Kubernetes", Kubernetes)

    # Act
    await application_operations.create(application.id)

    # Assert
    assert applied == [application.secrets]
    async with session_scope() as session:
        persisted = await session.get(Application, application.id)
    assert persisted is not None
    assert persisted.status == Status.running
    assert persisted.secrets["LONGLINK_IDENTITY_SECRET"] == "persisted-secret"


async def test_application_creation_skips_deployment_when_deleted_before_credential_persistence(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Do not deploy credentials after the application is deleted concurrently."""

    # Arrange
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(users[0], infrastructure=infrastructure)
    application = await create_application(organization)

    class Postgres:
        """Delete the application after its schema credentials are generated."""

        def __init__(self, *_args: object) -> None:
            """Accept the configured database connection values."""

        async def schema(self, *_args: object) -> dict[str, object]:
            """Delete the target before its runtime credentials are persisted."""

            async with session_scope() as session:
                persisted = await session.get(Application, application.id)
                assert persisted is not None
                await session.delete(persisted)
                await session.commit()
            return {
                "host": "database.example",
                "database_name": "organization",
                "password": "generated-password",
                "port": 5432,
                "sslmode": DatabaseSSLMode.disable,
                "username": "application",
            }

    class Storage:
        """Provide object-storage credentials without contacting storage."""

        region = "ch-gva-2"

        def __init__(self, *_args: object) -> None:
            """Accept the configured storage connection values."""

        async def credentials(self, *_args: object) -> dict[str, str]:
            """Return application-scoped object-storage credentials."""

            return {"access_key_id": "application", "secret_access_key": "generated-secret"}

    def unexpected_kubernetes(*_args: object) -> object:
        """Reject deployment after the concurrent deletion."""

        raise AssertionError("deleted application must not be deployed")

    monkeypatch.setattr(application_operations, "Postgres", Postgres)
    monkeypatch.setattr(application_operations, "Exoscale", Storage)
    monkeypatch.setattr(application_operations, "Kubernetes", unexpected_kubernetes)

    # Act
    result = await application_operations.create(application.id)

    # Assert
    assert result is None


async def test_application_deletion_skips_missing_application_without_constructing_providers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Treat a missing Application tombstone as completed cleanup."""

    # Arrange
    def unexpected_provider(*_args: object) -> object:
        """Reject provider construction for an absent cleanup target."""

        raise AssertionError("providers must not be constructed")

    monkeypatch.setattr(application_operations, "Postgres", unexpected_provider)
    monkeypatch.setattr(application_operations, "Exoscale", unexpected_provider)
    monkeypatch.setattr(application_operations, "Kubernetes", unexpected_provider)

    # Act and assert
    assert await application_operations.delete(uuid4()) is None
