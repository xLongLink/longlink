from uuid import UUID
from httpx2 import AsyncClient
from factories import create_application, create_organization, mark_organization_running, create_ready_infrastructure
from src.environments import env
from src.models.roles import ApplicationRoles, OrganizationRoles
from src.database.session import get_session
from src.database.services import operations, applications, organizations
from src.models.operations import OperationKind, OperationStatus
from src.database.models.users import User
from src.database.models.association import UserApplication, UserOrganization


async def test_list_organization_apps_returns_app_membership_role(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return the application-specific role instead of the organization role."""

    # Arrange
    owner = users[0]
    user = users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    app = await create_application(organization, owner)

    Session = await get_session()
    async with Session() as session:
        session.add(
            UserOrganization(
                user_id=user.id,
                organization_id=organization.id,
                role=OrganizationRoles.read,
            )
        )
        session.add(
            UserApplication(
                user_id=user.id,
                organization_id=organization.id,
                application_id=app.id,
                role=ApplicationRoles.write,
            )
        )
        await session.commit()

    client = clients[1]

    # Act
    response = await client.get(f"/api/organizations/{organization.id}/applications")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [item["application"]["id"] for item in payload] == [str(app.id)]
    assert payload[0]["role"] == ApplicationRoles.write
    assert "role" not in payload[0]["application"]


async def test_list_apps_without_organization_returns_all_apps_for_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return all applications when an admin does not filter by organization."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    acme = await create_organization(infrastructure, user)
    globex = await create_organization(infrastructure, user, name="globex", slug="globex")
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


async def test_list_apps_without_organization_requires_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Reject application listing for non-admin users."""

    # Arrange
    client = clients[1]

    # Act
    response = await client.get("/api/applications")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_list_organization_apps_returns_403_for_non_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application listing when the user does not belong to the organization."""

    # Arrange
    owner = users[0]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    await create_application(organization, owner)
    client = clients[1]

    # Act
    response = await client.get(f"/api/organizations/{organization.id}/applications")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_create_app_persists_desired_state_and_queues_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Persist Application desired state and return its compute Operation."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    await mark_organization_running(organization)
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
    application = payload["application"]
    operation = payload["operation"]
    assert application["status"] == "creating"
    assert application["description"] == "Dashboard app"
    assert application["image"] == "ghcr.io/longlink/dashboard:latest"
    assert operation["compute_id"] == str(infrastructure.compute.id)
    assert operation["kind"] == OperationKind.application_create
    assert operation["platform_version"] == env.VERSION
    assert operation["status"] == OperationStatus.scheduled

    persisted = await applications.get(UUID(application["id"]))
    assert persisted is not None
    assert persisted.organization_id == organization.id
    assert persisted.envs == {"API_KEY": "secret-value", "PORT": "8080"}
    queued = await operations.fetch()
    assert len(queued) == 2
    assert any(str(item.id) == operation["id"] for item in queued)


async def test_create_app_returns_403_for_regular_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application creation when the organization member lacks deployment permissions."""

    # Arrange
    owner = users[0]
    regular_member = users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)

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
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    app = await create_application(organization, user)
    registry = infrastructure.compute
    captured: dict[str, object] = {}

    class FakeCompute:
        """Fake compute adapter for application log tests."""

        def __init__(self, kubeconfig: str) -> None:
            """Capture compute registry configuration."""

            self.applications = self
            captured["kubeconfig"] = kubeconfig

        async def logs(self, application_id: str, namespace: str, compute_id: str, lines: int = 200) -> list[str]:
            """Record the log request and return fake pod logs."""

            captured["logs"] = {
                "application_id": application_id,
                "namespace": namespace,
                "compute_id": compute_id,
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
        "application_id": str(app.id),
        "namespace": organization.slug,
        "compute_id": str(registry.id),
        "lines": 200,
    }


async def test_app_logs_require_maintainer_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject log access for regular organization members."""

    # Arrange
    owner, member = users[0], users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
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
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    app = await create_application(organization, owner)

    class FailingCompute:
        """Fail the log request through the Kubernetes adapter boundary."""

        def __init__(self, kubeconfig: str) -> None:
            """Accept the selected compute registry."""

            assert kubeconfig == infrastructure.compute.kubeconfig
            self.applications = self

        async def logs(self, application_id: str, namespace: str, compute_id: str, lines: int = 200) -> list[str]:
            """Raise the backend error expected by the test."""

            assert application_id == str(app.id)
            assert namespace == organization.slug
            assert compute_id == str(infrastructure.compute.id)
            assert lines == 200
            raise RuntimeError("logs unavailable")

    monkeypatch.setattr("src.routes.applications.Kubernetes", FailingCompute)
    client = clients[0]

    # Act
    response = await client.get(f"/api/applications/{app.id}/logs")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Application logs unavailable"}


async def test_application_member_routes_list_update_remove_and_reject_missing_members(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Manage simple application roles through the route layer."""

    # Arrange
    owner, member, non_member = users
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    app = await create_application(organization, owner)
    Session = await get_session()
    async with Session() as session:
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.read))
        await session.commit()
    client = clients[0]

    # Act
    list_response = await client.get(f"/api/applications/{app.id}/members")
    create_response = await client.patch(f"/api/applications/{app.id}/members/{member.id}", json={"role": "read"})
    created_role = await applications.membership_role(app.id, member.id)
    remove_response = await client.patch(f"/api/applications/{app.id}/members/{member.id}", json={"role": None})
    removed_role = await applications.membership_role(app.id, member.id)
    missing_response = await client.patch(f"/api/applications/{app.id}/members/{non_member.id}", json={"role": "read"})

    # Assert
    assert list_response.status_code == 200
    assert {item["user"]["id"] for item in list_response.json()} == {str(owner.id), str(member.id)}
    assert create_response.status_code == 204
    assert created_role == ApplicationRoles.read
    assert remove_response.status_code == 204
    assert removed_role is None
    assert missing_response.status_code == 404
    assert missing_response.json() == {"detail": "Organization member not found"}


async def test_application_member_update_rejects_regular_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject application role changes from users without management access."""

    # Arrange
    owner, member = users[0], users[1]
    infrastructure = await create_ready_infrastructure(owner)
    organization = await create_organization(infrastructure, owner)
    app = await create_application(organization, owner)
    Session = await get_session()
    async with Session() as session:
        session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=OrganizationRoles.read))
        session.add(UserApplication(user_id=member.id, organization_id=organization.id, application_id=app.id, role=ApplicationRoles.read))
        await session.commit()
    client = clients[1]

    # Act
    response = await client.patch(f"/api/applications/{app.id}/members/{owner.id}", json={"role": "read"})

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_delete_application_soft_deletes_and_returns_reconciliation_operation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Soft-delete an Application and return its compute Operation."""

    # Arrange
    user = users[0]
    infrastructure = await create_ready_infrastructure(user)
    organization = await create_organization(infrastructure, user)
    app = await create_application(organization, user)
    client = clients[0]

    # Act
    response = await client.delete(f"/api/applications/{app.id}")
    retry_response = await client.delete(f"/api/applications/{app.id}")

    # Assert
    assert response.status_code == 202
    payload = response.json()
    assert retry_response.status_code == 202
    assert retry_response.json()["operation"]["id"] == payload["operation"]["id"]
    assert payload["application"]["id"] == str(app.id)
    assert payload["application"]["status"] == "deleting"
    assert payload["operation"]["compute_id"] == str(infrastructure.compute.id)
    assert payload["operation"]["kind"] == OperationKind.application_delete
    assert payload["operation"]["platform_version"] == env.VERSION
    assert payload["operation"]["status"] == OperationStatus.scheduled
    assert await applications.get(app.id) is None
    deleted = await applications.get(app.id, include_deleted=True)
    assert deleted is not None
    assert deleted.deleted_id == user.id
    recorded_operations = await operations.fetch()
    assert {item.kind for item in recorded_operations} == {
        OperationKind.application_create,
        OperationKind.application_delete,
        OperationKind.organization_create,
    }
    assert any(str(item.id) == payload["operation"]["id"] for item in recorded_operations)
