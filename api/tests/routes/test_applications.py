import pytest
from uuid import UUID
from types import SimpleNamespace
from httpx2 import AsyncClient
from fastapi import HTTPException
from sqlmodel import col
from factories import fetch_operations, create_application, create_organization
from sqlalchemy import select
from src.routes.v1 import applications as application_routes
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.models.operations import OperationKind
from src.models.applications import ApplicationCreate
from src.database.models.users import User
from src.database.models.operations import Operation
from src.database.models.association import UserOrganization
from src.database.models.applications import Application


class FakeCompute:
    """Fake Kubernetes log client with a configured result."""

    def __init__(self, outcome: list[str] | RuntimeError, captured: dict[str, UUID | str]) -> None:
        """Expose the application log client and its configured outcome."""

        self.applications = self
        self.outcome = outcome
        self.captured = captured

    async def logs(self, application_id: UUID, namespace: str) -> list[str]:
        """Record a request and return or raise the configured outcome."""

        self.captured["logs"] = application_id
        self.captured["namespace"] = namespace
        if isinstance(self.outcome, RuntimeError):
            raise self.outcome
        return self.outcome


async def test_list_applications_directly_returns_service_page(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return the application page produced by the service."""

    # Arrange
    pagination = SimpleNamespace(page=2, page_size=1)
    items: list[object] = [SimpleNamespace(id=UUID(int=1))]
    session = SimpleNamespace()

    async def fetch_page(actual_session: object, actual_pagination: object) -> tuple[list[object], int]:
        """Return a configured application page."""

        assert actual_session is session
        assert actual_pagination is pagination
        return items, 3

    monkeypatch.setattr(application_routes.applications, "fetch_page", fetch_page)

    # Act
    result = await application_routes.list_applications(SimpleNamespace(), pagination, session)

    # Assert
    assert result == {"items": items, "total": 3}


async def test_create_application_directly_rejects_members_without_maintenance_access(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject direct application creation before image inspection for write members."""

    # Arrange
    session = SimpleNamespace(commit_count=0)

    async def commit() -> None:
        """Record an unexpected transaction commit."""

        session.commit_count += 1

    async def membership(*_args: object) -> SimpleNamespace:
        """Return a write-only organization membership."""

        return SimpleNamespace(role=OrganizationRoles.write)

    async def unexpected_metadata(_image: Image) -> LongLinkMetadata:
        """Fail if authorization reaches image metadata inspection."""

        raise AssertionError("write members must not inspect image metadata")

    session.commit = commit
    monkeypatch.setattr(application_routes, "organization_access", membership)
    monkeypatch.setattr(application_routes.images, "metadata", unexpected_metadata)

    # Act
    with pytest.raises(HTTPException) as raised:
        await application_routes.create_application(
            UUID(int=1),
            ApplicationCreate(name="dashboard", image=Image("ghcr.io/longlink/dashboard:latest")),
            SimpleNamespace(),
            session,
        )

    # Assert
    assert raised.value.status_code == 403
    assert raised.value.detail == "Permission required"
    assert session.commit_count == 0


@pytest.mark.parametrize(
    ("metadata", "envs", "expected_status", "expected_detail"),
    [
        pytest.param(None, {}, 404, "Image metadata not found", id="missing-metadata"),
        pytest.param(
            LongLinkMetadata(
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                environments=[EnvironmentMetadata(name="API_KEY", required=True)],
            ),
            {},
            422,
            "Application environment does not satisfy required image variables: API_KEY",
            id="missing-required-environment",
        ),
    ],
)
async def test_create_application_directly_rejects_invalid_image_requirements(
    monkeypatch: pytest.MonkeyPatch,
    metadata: LongLinkMetadata | None,
    envs: dict[str, str],
    expected_status: int,
    expected_detail: str,
) -> None:
    """Reject absent image metadata and unsatisfied image environment requirements."""

    # Arrange
    session = SimpleNamespace(commit_count=0)

    async def membership(*_args: object) -> SimpleNamespace:
        """Return a maintainer organization membership."""

        return SimpleNamespace(role=OrganizationRoles.maintain)

    async def inspect_image(_image: Image) -> LongLinkMetadata | None:
        """Return the configured image metadata."""

        return metadata

    async def commit() -> None:
        """Record an unexpected transaction commit."""

        session.commit_count += 1

    session.commit = commit
    monkeypatch.setattr(application_routes, "organization_access", membership)
    monkeypatch.setattr(application_routes.images, "metadata", inspect_image)

    # Act
    with pytest.raises(HTTPException) as raised:
        await application_routes.create_application(
            UUID(int=1),
            ApplicationCreate(name="dashboard", image=Image("ghcr.io/longlink/dashboard:latest"), envs=envs),
            SimpleNamespace(),
            session,
        )

    # Assert
    assert raised.value.status_code == expected_status
    assert raised.value.detail == expected_detail
    assert session.commit_count == 0


async def test_create_application_directly_persists_when_image_requirements_are_satisfied(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Create application state after image requirements are satisfied."""

    # Arrange
    organization_id = UUID(int=1)
    image = Image("ghcr.io/longlink/dashboard@sha256:test")
    session = SimpleNamespace(commit_count=0)
    captured: dict[str, object] = {}

    async def membership(*_args: object) -> SimpleNamespace:
        """Return a maintainer organization membership."""

        return SimpleNamespace(role=OrganizationRoles.maintain)

    async def inspect_image(_image: Image) -> LongLinkMetadata:
        """Return deployable image metadata with a satisfied environment requirement."""

        return LongLinkMetadata(image=image, environments=[EnvironmentMetadata(name="API_KEY", required=True)])

    async def create(*args: object, **kwargs: object) -> None:
        """Capture the state passed to the application service."""

        captured["args"] = args
        captured["kwargs"] = kwargs

    async def commit() -> None:
        """Record the durable transaction commit."""

        session.commit_count += 1

    session.commit = commit
    monkeypatch.setattr(application_routes, "organization_access", membership)
    monkeypatch.setattr(application_routes.images, "metadata", inspect_image)
    monkeypatch.setattr(application_routes.applications, "create", create)

    # Act
    await application_routes.create_application(
        organization_id,
        ApplicationCreate(name="dashboard", image=Image("ghcr.io/longlink/dashboard:latest"), envs={"API_KEY": "secret"}),
        SimpleNamespace(),
        session,
    )

    # Assert
    assert captured["args"] == (session, organization_id, "dashboard")
    assert captured["kwargs"] == {"image": image, "description": None, "secrets": {"API_KEY": "secret"}}
    assert session.commit_count == 1


@pytest.mark.parametrize(
    ("access", "expected_detail"),
    [
        pytest.param(None, "Access required", id="missing-runtime-access"),
        pytest.param(
            (
                SimpleNamespace(id=UUID(int=1)),
                SimpleNamespace(id=UUID(int=2)),
                OrganizationRoles.write,
                SimpleNamespace(kubeconfig="test-kubeconfig"),
            ),
            "Permission required",
            id="insufficient-role",
        ),
    ],
)
async def test_get_application_logs_directly_rejects_missing_or_insufficient_access(
    monkeypatch: pytest.MonkeyPatch,
    access: tuple[object, object, OrganizationRoles, object] | None,
    expected_detail: str,
) -> None:
    """Reject unavailable runtime access before constructing a Kubernetes client."""

    # Arrange
    async def runtime_access(*_args: object) -> tuple[object, object, OrganizationRoles, object] | None:
        """Return the configured runtime access result."""

        return access

    def unexpected_kubernetes(*_args: object) -> object:
        """Fail if unauthorized access reaches the cluster boundary."""

        raise AssertionError("Kubernetes client was constructed")

    monkeypatch.setattr(application_routes.organizations, "application_runtime_access", runtime_access)
    monkeypatch.setattr(application_routes, "Kubernetes", unexpected_kubernetes)

    # Act
    with pytest.raises(HTTPException) as raised:
        await application_routes.get_application_logs(UUID(int=1), SimpleNamespace(id=UUID(int=3)), SimpleNamespace())

    # Assert
    assert raised.value.status_code == 403
    assert raised.value.detail == expected_detail


async def test_get_application_logs_directly_translates_compute_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Translate direct Kubernetes log failures into the public unavailable error."""

    # Arrange
    application_id = UUID(int=1)
    organization_id = UUID(int=2)

    async def runtime_access(*_args: object) -> tuple[object, object, OrganizationRoles, object]:
        """Return a maintainer's running application registry assignment."""

        return (
            SimpleNamespace(id=application_id),
            SimpleNamespace(id=organization_id),
            OrganizationRoles.maintain,
            SimpleNamespace(kubeconfig="test-kubeconfig"),
        )

    monkeypatch.setattr(application_routes.organizations, "application_runtime_access", runtime_access)
    monkeypatch.setattr(application_routes, "Kubernetes", lambda _kubeconfig: FakeCompute(RuntimeError("unavailable"), {}))

    # Act
    with pytest.raises(HTTPException) as raised:
        await application_routes.get_application_logs(application_id, SimpleNamespace(id=UUID(int=3)), SimpleNamespace())

    # Assert
    assert raised.value.status_code == 503
    assert raised.value.detail == "Application logs unavailable"


async def test_list_apps_returns_requested_page_for_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return only the requested administrator application page."""

    # Arrange
    user = users[0]
    acme = await create_organization(user)
    globex = await create_organization(user, name="globex")
    await create_application(acme)
    console = await create_application(globex, name="console")

    # Act
    paged_response = await clients[0].get("/api/v1/applications?page=2&page_size=1")

    # Assert
    assert paged_response.status_code == 200
    assert [item["id"] for item in paged_response.json()["items"]] == [str(console.id)]
    assert paged_response.json()["total"] == 2


async def test_list_apps_omits_deleted_applications_from_items_and_total(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Exclude deleted Applications from administrator list results and totals."""

    # Arrange
    organization = await create_organization(users[0])
    active_application = await create_application(organization, name="active")
    deleted_application = await create_application(organization, name="deleted")
    delete_response = await clients[0].delete(f"/api/v1/applications/{deleted_application.id}")
    assert delete_response.status_code == 204

    # Act
    response = await clients[0].get("/api/v1/applications")

    # Assert
    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [str(active_application.id)]
    assert response.json()["total"] == 1


async def test_create_app_persists_desired_state_and_queues_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Persist Application desired state and queue its compute Operation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)

    async def inspect_image(_image: str) -> LongLinkMetadata:
        """Return immutable metadata with one required user environment value."""

        return LongLinkMetadata(
            image=Image("ghcr.io/longlink/dashboard@sha256:test"),
            environments=[EnvironmentMetadata(name="API_KEY", required=True)],
        )

    monkeypatch.setattr("src.routes.v1.applications.images.metadata", inspect_image)

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/applications",
        json={
            "name": "dashboard",
            "image": "ghcr.io/longlink/dashboard:latest",
            "description": "Dashboard app",
            "envs": {
                "API_KEY": "secret-value",
                "PORT": "8080",
            },
        },
    )

    # Assert
    assert response.status_code == 204

    async with session_scope() as session:
        persisted = await session.scalar(select(Application).where(col(Application.organization_id) == organization.id))
        assert persisted is not None
        assert persisted.status == Status.creating
        assert persisted.description == "Dashboard app"
        assert persisted.image_desired == "ghcr.io/longlink/dashboard@sha256:test"
        assert persisted.secrets == {"API_KEY": "secret-value", "PORT": "8080"}
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.application_create,
                col(Operation.target_id) == persisted.id,
            )
        )
        assert operation is not None


@pytest.mark.parametrize(
    ("metadata", "expected_status", "expected_detail"),
    [
        pytest.param(None, 404, "Image metadata not found", id="missing-metadata"),
        pytest.param(
            LongLinkMetadata(
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                environments=[EnvironmentMetadata(name="API_KEY", required=True)],
            ),
            422,
            "Application environment does not satisfy required image variables: API_KEY",
            id="missing-required-environment",
        ),
    ],
)
async def test_create_app_rejects_invalid_image_metadata(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    metadata: LongLinkMetadata | None,
    expected_status: int,
    expected_detail: str,
) -> None:
    """Reject unavailable image metadata and missing required environment values."""

    # Arrange
    organization = await create_organization(users[0])

    async def inspect_image(_image: Image) -> LongLinkMetadata | None:
        """Return the configured metadata response."""

        return metadata

    monkeypatch.setattr("src.routes.v1.applications.images.metadata", inspect_image)
    operation_ids = [operation.id for operation in await fetch_operations()]

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}
    async with session_scope() as session:
        assert await session.scalar(select(Application).where(col(Application.organization_id) == organization.id)) is None
    assert [operation.id for operation in await fetch_operations()] == operation_ids


async def test_create_app_validates_payload_before_checking_organization_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject an invalid request body before inspecting membership or image metadata."""

    # Arrange
    organization = await create_organization(users[0])

    async def unexpected_metadata(_image: Image) -> LongLinkMetadata:
        """Fail if invalid input reaches remote image inspection."""

        raise AssertionError("invalid application payload must not inspect image metadata")

    monkeypatch.setattr("src.routes.v1.applications.images.metadata", unexpected_metadata)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/applications",
        json={"name": "dashboard"},
    )

    # Assert
    assert response.status_code == 422


async def test_create_app_rejects_non_member_without_creating_state(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application creation before image inspection for non-members."""

    # Arrange
    organization = await create_organization(users[0])
    operation_ids = [operation.id for operation in await fetch_operations()]

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}
    async with session_scope() as session:
        assert await session.scalar(select(Application).where(col(Application.organization_id) == organization.id)) is None
    assert [operation.id for operation in await fetch_operations()] == operation_ids


async def test_create_app_rejects_duplicate_organization_slug_without_queuing_work(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject duplicate Application slugs without adding a lifecycle operation."""

    # Arrange
    organization = await create_organization(users[0])
    await create_application(organization, name="Dashboard")
    operation_ids = [operation.id for operation in await fetch_operations()]

    async def inspect_image(_image: Image) -> LongLinkMetadata:
        """Return valid immutable image metadata."""
        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test"))

    monkeypatch.setattr("src.routes.v1.applications.images.metadata", inspect_image)

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Application slug already exists"}
    async with session_scope() as session:
        applications = (await session.scalars(select(Application).where(col(Application.organization_id) == organization.id))).all()
    assert len(applications) == 1
    assert [operation.id for operation in await fetch_operations()] == operation_ids


async def test_application_responses_do_not_expose_environment_secrets(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Redact persisted Application environment values from every response surface."""

    # Persist one Application with a value that must remain runtime-only.
    owner = users[0]
    organization = await create_organization(owner)
    await create_application(organization, secrets={"API_KEY": "runtime-secret"})

    # Read the administrator list and Organization application response surfaces.
    list_response = await clients[0].get("/api/v1/applications")
    organization_response = await clients[0].get(f"/api/v1/organizations/{organization.id}/applications")

    # Response models must omit both the secret field and its raw value.
    assert list_response.status_code == 200
    assert organization_response.status_code == 200
    list_applications = list_response.json()["items"]
    organization_applications = organization_response.json()
    assert all("secrets" not in item and "envs" not in item for item in list_applications)
    assert all("secrets" not in item and "envs" not in item for item in organization_applications)
    assert "runtime-secret" not in list_response.text
    assert "runtime-secret" not in organization_response.text


async def test_create_app_returns_403_for_regular_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application creation when the organization member lacks deployment permissions."""

    # Arrange
    owner = users[0]
    regular_member = users[1]
    organization = await create_organization(owner)

    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_create_app_allows_maintainer_and_queues_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Allow maintainers to create applications and queue their deployment."""

    # Arrange
    owner, maintainer = users[0], users[1]
    organization = await create_organization(owner)
    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=maintainer.id,
                organization_id=organization.id,
                role=OrganizationRoles.maintain,
            )
        )
        await session.commit()

    async def inspect_image(_image: Image) -> LongLinkMetadata:
        """Return deployable image metadata without a registry request."""

        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test"), environments=[])

    monkeypatch.setattr("src.routes.v1.applications.images.metadata", inspect_image)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 204
    async with session_scope() as session:
        application = await session.scalar(select(Application).where(col(Application.organization_id) == organization.id))
        assert application is not None
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.application_create,
                col(Operation.target_id) == application.id,
            )
        )
    assert operation is not None


async def test_get_app_logs_returns_pod_logs(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return recent pod logs through the Organization's compute cluster."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)
    app = await create_application(organization)
    captured: dict[str, UUID | str] = {}
    monkeypatch.setattr("src.routes.v1.applications.Kubernetes", lambda _kubeconfig: FakeCompute(["line 1", "line 2"], captured))

    # Act
    response = await clients[0].get(f"/api/v1/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 200
    assert response.json() == ["line 1", "line 2"]
    assert captured["logs"] == app.id
    assert captured["namespace"] == organization.id.hex


@pytest.mark.parametrize(
    ("role", "expected_detail"),
    [
        pytest.param(None, "Access required", id="non-member"),
        pytest.param(OrganizationRoles.write, "Permission required", id="write-member"),
    ],
)
async def test_app_logs_reject_non_maintainers_before_constructing_kubernetes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    role: OrganizationRoles | None,
    expected_detail: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject non-members and write members before reaching the compute cluster."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    app = await create_application(organization)
    if role is not None:
        async with session_scope() as session:
            session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=role))
            await session.commit()

    def unexpected_kubernetes(*_args: object) -> object:
        """Fail if authorization reaches the external cluster boundary."""

        raise AssertionError("Kubernetes client was constructed")

    monkeypatch.setattr("src.routes.v1.applications.Kubernetes", unexpected_kubernetes)

    # Act
    response = await clients[1].get(f"/api/v1/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": expected_detail}


async def test_app_logs_return_unavailable_when_backend_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return a stable error when pod logs cannot be loaded."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    app = await create_application(organization)
    monkeypatch.setattr("src.routes.v1.applications.Kubernetes", lambda _kubeconfig: FakeCompute(RuntimeError("logs unavailable"), {}))

    # Act
    response = await clients[0].get(f"/api/v1/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Application logs unavailable"}


async def test_app_logs_reject_deleted_application_before_constructing_kubernetes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject runtime logs for deleted Applications before reaching Kubernetes."""

    # Arrange
    organization = await create_organization(users[0])
    application = await create_application(organization)
    delete_response = await clients[0].delete(f"/api/v1/applications/{application.id}")
    assert delete_response.status_code == 204

    def unexpected_kubernetes(*_args: object) -> object:
        """Fail if a deleted Application reaches the cluster boundary."""

        raise AssertionError("Kubernetes client was constructed")

    monkeypatch.setattr("src.routes.v1.applications.Kubernetes", unexpected_kubernetes)

    # Act
    response = await clients[0].get(f"/api/v1/applications/{application.id}/logs")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_delete_application_soft_deletes_and_queues_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an Application and queue its reconciliation operation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)
    app = await create_application(organization)

    # Act
    response = await clients[0].delete(f"/api/v1/applications/{app.id}")

    # Assert
    assert response.status_code == 204
    async with session_scope() as session:
        deleted_application = await session.get(Application, app.id)
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.application_delete,
                col(Operation.target_id) == app.id,
            )
        )
        assert deleted_application is not None
        assert deleted_application.deleted_at is not None
        assert operation is not None


async def test_delete_application_rejects_write_member_without_mutating_application(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject write members from deleting an Application or queueing cleanup."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    app = await create_application(organization)
    async with session_scope() as session:
        session.add(
            UserOrganization(
                user_id=member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    # Act
    response = await clients[1].delete(f"/api/v1/applications/{app.id}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    async with session_scope() as session:
        application = await session.get(Application, app.id)
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.application_delete,
                col(Operation.target_id) == app.id,
            )
        )
        assert application is not None
        assert application.deleted_at is None
        assert operation is None
