import pytest
from uuid import UUID
from httpx2 import AsyncClient
from sqlmodel import col
from factories import create_application, create_organization
from sqlalchemy import select
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.models.operations import OperationKind
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


async def test_list_apps_without_organization_returns_all_apps_for_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return all applications when an admin does not filter by organization."""

    # Arrange
    user = users[0]
    acme = await create_organization(user)
    globex = await create_organization(user, name="globex", slug="globex")
    dashboard = await create_application(acme)
    console = await create_application(
        globex,
        name="console",
        image="ghcr.io/longlink/console:latest",
    )
    # Act
    response = await clients[0].get("/api/v1/applications")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert {item["id"] for item in payload["items"]} == {
        str(dashboard.id),
        str(console.id),
    }
    assert payload["total"] == 2


async def test_list_apps_returns_requested_page_for_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return only the requested administrator application page."""

    # Arrange
    user = users[0]
    acme = await create_organization(user)
    globex = await create_organization(user, name="globex", slug="globex")
    await create_application(acme)
    console = await create_application(globex, name="console")

    # Act
    response = await clients[0].get("/api/v1/applications?page=2&page_size=1")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [item["id"] for item in payload["items"]] == [str(console.id)]
    assert payload["total"] == 2


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


async def test_application_responses_do_not_expose_environment_secrets(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Redact persisted Application environment values from every response surface."""

    # Persist one Application with a value that must remain runtime-only.
    owner = users[0]
    organization = await create_organization(owner)
    application = await create_application(organization, secrets={"API_KEY": "runtime-secret"})

    # Read the administrator list and Organization detail response surfaces.
    list_response = await clients[0].get("/api/v1/applications")
    organization_response = await clients[0].get(f"/api/v1/organizations/{organization.id}")

    # Response models must omit both the secret field and its raw value.
    assert list_response.status_code == 200
    assert organization_response.status_code == 200
    list_applications = list_response.json()["items"]
    for response_applications in (list_applications, organization_response.json()["applications"]):
        assert all("secrets" not in item and "envs" not in item for item in response_applications)
    assert "runtime-secret" not in list_response.text
    assert "runtime-secret" not in organization_response.text
    assert str(application.id) in {item["id"] for item in list_applications}


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


async def test_app_logs_require_maintainer_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject log access for regular organization members."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    app = await create_application(organization)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.write))
        await session.commit()

    # Act
    response = await clients[1].get(f"/api/v1/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_app_logs_require_organization_membership(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject log access before constructing a Kubernetes client for non-members."""

    # Arrange
    organization = await create_organization(users[0])
    application = await create_application(organization)

    def unexpected_kubernetes(*_args: object) -> object:
        """Fail if authorization reaches the external cluster boundary."""

        raise AssertionError("Kubernetes client was constructed")

    monkeypatch.setattr("src.routes.v1.applications.Kubernetes", unexpected_kubernetes)

    # Act
    response = await clients[1].get(f"/api/v1/applications/{application.id}/logs")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


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
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.application_delete,
                col(Operation.target_id) == app.id,
            )
        )
        assert operation is not None
