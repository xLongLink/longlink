import pytest
from factories import claim_operation, complete_operation, create_application, create_organization, create_ready_infrastructure
from src.operations import applications as application_operations
from src.utils.jobs import execute
from src.models.types import DatabaseSSLMode
from src.database.session import session_scope
from src.database.services import applications
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User
from src.database.models.applications import Application


async def test_application_delete_failure_stops_before_provider_credential_cleanup(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Retain a tombstone when Kubernetes deletion fails before provider cleanup."""

    # Queue deletion for an Application with real persisted infrastructure assignments.
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    application = await create_application(organization, owner)
    async with session_scope() as session:
        await applications.delete(session, application.id, owner.id)
        await session.commit()

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
    failed = await execute(claimed, application_operations.delete)

    # The failed operation retains its tombstone and never reaches provider cleanup.
    assert failed.status == OperationStatus.failed
    async with session_scope() as session:
        retained = await session.get(Application, application.id)
    assert retained is not None
    assert retained.deleted_at is not None


async def test_application_creation_applies_user_and_managed_environment_values(
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Apply the complete persisted runtime environment on initial deployment."""

    # Persist an Application with a user-owned runtime value.
    owner = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(owner, infrastructure=infrastructure)
    application = await create_application(organization, owner, secrets={"API_KEY": "runtime-secret"})
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
    assert await application_operations.create(application.id) is None

    # User values and generated Platform values share the runtime Secret.
    assert captured["secrets"]["API_KEY"] == "runtime-secret"
    assert captured["secrets"]["LONGLINK_DATABASE_PASSWORD"] == "generated-password"
