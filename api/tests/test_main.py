import main
import runpy
import pytest
from httpx2 import AsyncClient
from pathlib import Path
from conftest import UNTRUSTED_ORIGINS, assert_origin_rejected, untrusted_origin_headers
from sqlmodel import col, select
from factories import add_member, create_compute, create_solution, fetch_operations, create_organization, assert_no_new_operations
from src.utils import images
from sqlalchemy import func
from collections.abc import Callable, Awaitable
from src.models.roles import OrganizationRoles
from fastapi.testclient import TestClient
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.association import UserOrganization
from src.database.models.invitations import OrganizationInvitation
from src.database.models.organizations import Organization


async def test_authenticated_solution_update_rejects_untrusted_origin_before_inspection(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject cross-origin updates before registry inspection or revision persistence."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    previous_operations = await fetch_operations()

    async def unexpected_metadata(*_args: object) -> object:
        """Fail if a rejected browser request reaches registry inspection."""

        raise AssertionError("untrusted solution update must not inspect image metadata")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    response = await clients[0].post(f"/api/v1/solutions/{solution.id}/update", json={}, headers={"origin": "https://attacker.example"})

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        persisted = await session.get(Solution, solution.id)
    assert persisted is not None
    assert persisted.desired_revision_id == solution.desired_revision_id
    await assert_no_new_operations(previous_operations)


@pytest.mark.parametrize("resource_kind", ["solution", "organization"])
async def test_authenticated_deletion_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], resource_kind: str
) -> None:
    """Reject cross-origin deletion before tombstoning either resource or queueing cleanup."""

    # Arrange
    organization = await create_organization(users[0])
    resource = await create_solution(organization) if resource_kind == "solution" else organization
    previous_operations = await fetch_operations()

    # Act
    response = await clients[0].delete(f"/api/v1/{resource_kind}s/{resource.id}", headers={"origin": "https://attacker.example"})

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        persisted = await session.get(type(resource), resource.id)
    assert persisted is not None
    assert persisted.deleted_at is None
    await assert_no_new_operations(previous_operations)


async def test_authenticated_invitation_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    captured_mail: list[tuple[str, str, str, str | None]],
) -> None:
    """Reject cross-origin invitations before persistence or mail delivery."""

    # Arrange
    organization = await create_organization(users[0])

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/invitations",
        json={"email": users[1].email, "role": "write"},
        headers={"origin": "https://attacker.example"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        assert await session.scalar(select(OrganizationInvitation)) is None
    assert captured_mail == []


async def test_authenticated_member_role_update_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Reject cross-origin role changes before modifying organization membership."""

    # Arrange
    organization = await create_organization(users[0])
    await add_member(user=users[1], organization=organization, role=OrganizationRoles.write)
    async with session_scope() as session:
        original = await session.get(UserOrganization, (users[1].id, organization.id))
        assert original is not None
        original_updated_at = original.updated_at

    # Act
    response = await clients[0].patch(
        f"/api/v1/organizations/{organization.id}/members/{users[1].id}",
        json={"role": "admin"},
        headers={"origin": "https://attacker.example"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Origin required"}
    async with session_scope() as session:
        unchanged = await session.get(UserOrganization, (users[1].id, organization.id))
    assert unchanged is not None
    assert unchanged.role == OrganizationRoles.write
    assert unchanged.updated_at == original_updated_at


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
async def test_authenticated_organization_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], origin: str | None
) -> None:
    """Reject unsafe cookie-authenticated writes before the route can persist data."""

    # Arrange
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].post("/api/v1/organizations", json={"name": "acme"}, headers=headers)

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        result = await session.execute(select(Organization))
        organizations = result.scalars().all()
    assert organizations == []


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
async def test_authenticated_profile_update_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], origin: str | None
) -> None:
    """Reject cookie-authenticated profile writes before the route can persist data."""

    # Arrange
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].patch("/api/v1/me", json={"name": "attacker-name"}, headers=headers)

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        persisted = await session.get(User, users[0].id)
    assert persisted is not None
    assert persisted.name == users[0].name


@pytest.mark.parametrize("origin", [None, "https://attacker.example"])
async def test_authenticated_solution_creation_rejects_untrusted_origin_before_persistence(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], origin: str | None
) -> None:
    """Reject cookie-authenticated solution writes before the route can persist data."""

    # Arrange
    organization = await create_organization(users[0])
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
        headers=headers,
    )

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        count = await session.scalar(select(func.count()).select_from(Solution).where(col(Solution.organization_id) == organization.id))
    assert count == 0


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
async def test_authenticated_compute_creation_rejects_untrusted_origin_before_verification(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch, origin: str | None
) -> None:
    """Reject cookie-authenticated Compute writes before infrastructure construction."""

    # Arrange
    def unexpected_kubernetes(*_args: object, **_kwargs: object) -> None:
        """Fail if an untrusted Compute write reaches infrastructure construction."""

        raise AssertionError("untrusted Compute write must not verify infrastructure")

    monkeypatch.setattr("src.routes.v1.admin.computes.Kubernetes", unexpected_kubernetes)
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].post(
        "/api/v1/computes",
        json={
            "name": "attacker-compute",
            "gateway_url": "https://gateway.example",
            "database_storage_class": "local-path",
            "storage_endpoint": "https://storage.example",
            "kubeconfig": {
                "clusters": [{"name": "cluster", "cluster": {}}],
                "contexts": [{"name": "context", "context": {"cluster": "cluster", "user": "user"}}],
                "current-context": "context",
                "users": [{"name": "user", "user": {}}],
            },
        },
        headers=headers,
    )

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        assert await session.scalar(select(ComputeRegistry)) is None
    assert await fetch_operations() == []


@pytest.mark.parametrize("origin", UNTRUSTED_ORIGINS)
async def test_authenticated_compute_deletion_rejects_untrusted_origin_without_mutation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], origin: str | None
) -> None:
    """Reject cookie-authenticated Compute deletion before the registry can change."""

    # Arrange
    compute = await create_compute()
    headers = untrusted_origin_headers(clients[0], origin)

    # Act
    response = await clients[0].delete(f"/api/v1/computes/{compute.id}", headers=headers)

    # Assert
    assert_origin_rejected(response)
    async with session_scope() as session:
        assert await session.get(ComputeRegistry, compute.id) is not None


@pytest.mark.no_db
def test_static_web_bundle_serves_root() -> None:
    """Serve the built API web bundle at the root path."""

    response = TestClient(main.app).get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


@pytest.mark.no_db
def test_main_skips_static_routes_when_web_bundle_is_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    """Construct the API without frontend routes when the bundle is unavailable."""

    # Arrange
    monkeypatch.setattr(Path, "exists", lambda _path: False)

    # Act
    module = runpy.run_path(main.__file__, run_name="main_without_static_bundle")

    # Assert
    app = module["app"]
    assert all(getattr(route, "path", None) != "/" for route in app.routes)


@pytest.mark.no_db
async def test_lifespan_starts_and_stops_background_jobs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Start administrator reconciliation and scheduler work without delaying serving."""

    # Arrange
    events: list[str] = []

    async def dispose_engine() -> None:
        """Record shared database engine disposal."""

        events.append("dispose")

    async def dispose_clients() -> None:
        """Record shared Kubernetes transport disposal."""

        events.append("kubernetes dispose")

    def run_background_task(name: str) -> Callable[[], Awaitable[None]]:
        """Return one task that records its startup and lifespan-shutdown cancellation."""

        async def background_task() -> None:
            """Record background task startup and cancellation from lifespan shutdown."""

            events.append(f"{name} start")
            try:
                await main.asyncio.Event().wait()
            except main.asyncio.CancelledError:

                # Record cancellation before propagating it to the lifespan owner.
                events.append(f"{name} cancel")
                raise

        return background_task

    monkeypatch.setattr(main.jobs, "run_administrator_reconciler", run_background_task("administrator"))
    monkeypatch.setattr(main.jobs, "run_operation_scheduler", run_background_task("scheduler"))
    monkeypatch.setattr(main.client, "dispose_clients", dispose_clients)
    monkeypatch.setattr(main, "dispose_engine", dispose_engine)

    # Act
    async with main.lifespan(main.app):
        await main.asyncio.sleep(0)
        events.append("serving")

    # Assert both jobs stop before the shared Kubernetes transport and database pool are disposed.
    assert set(events[:2]) == {"administrator start", "scheduler start"}
    assert events[2] == "serving"
    assert set(events[3:5]) == {"administrator cancel", "scheduler cancel"}
    assert events[5:] == ["kubernetes dispose", "dispose"]
