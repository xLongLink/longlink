from uuid import UUID
from httpx2 import AsyncClient
from factories import create_application, create_organization, mark_organization_running, create_ready_infrastructure
from src.models.roles import OrganizationRoles
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.database.session import get_session
from src.database.services import operations, applications
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.association import UserOrganization


async def test_list_apps_without_organization_returns_all_apps_for_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return all applications when an admin does not filter by organization."""

    # Arrange
    user = users[0]
    await create_ready_infrastructure()
    acme = await create_organization(user)
    globex = await create_organization(user, name="globex", slug="globex")
    dashboard = await create_application(acme, user)
    console = await create_application(
        globex,
        user,
        name="console",
        slug="console",
        image="ghcr.io/longlink/console:latest",
    )
    client = clients[0]

    # Act
    response = await client.get("/api/applications")

    # Assert
    assert response.status_code == 200
    assert {item["id"] for item in response.json()} == {
        str(dashboard.id),
        str(console.id),
    }
async def test_create_app_persists_desired_state_and_queues_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Persist Application desired state and return its compute Operation."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(user)
    await mark_organization_running(organization)
    staged: dict[str, object] = {}

    async def inspect_image(image: str) -> LongLinkMetadata:
        """Return immutable metadata with one required user environment value."""

        assert image == "ghcr.io/longlink/dashboard:latest"
        return LongLinkMetadata(
            image="ghcr.io/longlink/dashboard@sha256:test",
            digest="sha256:test",
            sdk="1.2.3",
            version="2.0.0",
            environments=[EnvironmentMetadata(name="API_KEY", type="string", required=True)],
        )

    class FakeCompute:
        """Capture Application environment Secret staging."""

        def __init__(self, kubeconfig: str) -> None:
            """Capture the assigned compute target."""

            assert kubeconfig == infrastructure.compute.kubeconfig
            self.applications = self

        async def stage_envs(self, application_id: UUID, namespace: str, envs: dict[str, str]) -> None:
            """Record user values sent to the Kubernetes Secret boundary."""

            staged.update({"application_id": application_id, "namespace": namespace, "envs": envs})

    monkeypatch.setattr("src.routes.applications.Kubernetes", FakeCompute)
    monkeypatch.setattr("src.routes.applications.images.metadata", inspect_image)
    client = clients[0]

    # Act
    response = await client.post(
        f"/api/organizations/{organization.id}/applications",
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
    assert response.status_code == 202
    payload = response.json()
    assert payload["status"] == "creating"
    assert payload["description"] == "Dashboard app"
    assert payload["image"] == "ghcr.io/longlink/dashboard@sha256:test"
    assert payload["sdk"] == "1.2.3"
    assert payload["version"] == "2.0.0"

    persisted = await applications.get(UUID(payload["id"]))
    assert persisted is not None
    assert persisted.organization_id == organization.id
    assert not hasattr(persisted, "envs")
    assert staged == {
        "application_id": persisted.id,
        "namespace": organization.id.hex,
        "envs": {"API_KEY": "secret-value", "PORT": "8080"},
    }
    queued = await operations.fetch()
    assert len(queued) == 2
    assert any(item.kind == OperationKind.application_create and item.target_id == persisted.id for item in queued)


async def test_create_app_returns_403_for_regular_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application creation when the organization member lacks deployment permissions."""

    # Arrange
    owner = users[0]
    regular_member = users[1]
    await create_ready_infrastructure()
    organization = await create_organization(owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=regular_member.id,
                organization_id=organization.id,
                role=OrganizationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = await client.post(
        f"/api/organizations/{organization.id}/applications",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_get_app_logs_returns_pod_logs(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return recent pod logs through the Organization's compute cluster."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure()
    organization = await create_organization(user)
    app = await create_application(organization, user)
    registry = infrastructure.compute
    captured: dict[str, object] = {}

    class FakeCompute:
        """Fake compute adapter for application log tests."""

        def __init__(self, kubeconfig: str) -> None:
            """Capture compute registry configuration."""

            self.applications = self
            captured["kubeconfig"] = kubeconfig

        async def logs(self, application_id: UUID, lines: int = 200) -> list[str]:
            """Record the log request and return fake pod logs."""

            captured["logs"] = {
                "application_id": application_id,
                "lines": lines,
            }
            return ["line 1", "line 2"]

    monkeypatch.setattr("src.routes.applications.Kubernetes", FakeCompute)
    client = clients[0]

    # Act
    response = await client.get(f"/api/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 200
    assert response.json() == ["line 1", "line 2"]
    assert captured["kubeconfig"] == registry.kubeconfig
    assert captured["logs"] == {
        "application_id": app.id,
        "lines": 200,
    }


async def test_app_logs_require_maintainer_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject log access for regular organization members."""

    # Arrange
    owner, member = users[0], users[1]
    await create_ready_infrastructure()
    organization = await create_organization(owner)
    app = await create_application(organization, owner)
    Session = await get_session()
    async with Session() as session:
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.write))
        await session.commit()
    client = clients[1]

    # Act
    response = await client.get(f"/api/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_app_logs_return_unavailable_when_backend_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch,
) -> None:
    """Return a stable error when pod logs cannot be loaded."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    app = await create_application(organization, owner)

    class FailingCompute:
        """Fail the log request through the Kubernetes adapter boundary."""

        def __init__(self, kubeconfig: str) -> None:
            """Accept a compute registry configuration."""

            self.applications = self

        async def logs(self, application_id: UUID, lines: int = 200) -> list[str]:
            """Raise the backend error expected by the test."""

            raise RuntimeError("logs unavailable")

    monkeypatch.setattr("src.routes.applications.Kubernetes", FailingCompute)
    client = clients[0]

    # Act
    response = await client.get(f"/api/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Application logs unavailable"}


async def test_delete_application_soft_deletes_and_returns_transitional_resource(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an Application and return its transitional resource state."""

    # Arrange
    user = users[0]
    await create_ready_infrastructure()
    organization = await create_organization(user)
    app = await create_application(organization, user)
    client = clients[0]

    # Act
    response = await client.delete(f"/api/applications/{app.id}")
    retry_response = await client.delete(f"/api/applications/{app.id}")

    # Assert
    assert response.status_code == 202
    payload = response.json()
    assert retry_response.status_code == 202
    assert retry_response.json()["id"] == payload["id"]
    assert payload["id"] == str(app.id)
    assert payload["status"] == "deleting"
    recorded_operations = await operations.fetch()
    assert {item.kind for item in recorded_operations} == {
        OperationKind.application_create,
        OperationKind.application_delete,
        OperationKind.compute_reconcile,
        OperationKind.organization_create,
    }
    assert any(item.kind == OperationKind.application_delete and item.target_id == app.id for item in recorded_operations)
