import io
import json
import pytest
import asyncio
import zipfile
from uuid import UUID, uuid4
from httpx2 import AsyncClient, ASGITransport
from fastapi import HTTPException
from conftest import DatabaseKubernetes
from sqlmodel import col
from factories import add_member, create_solution, fetch_operations, create_organization, assert_no_new_operations
from src.utils import images
from sqlalchemy import func, event, select
from sqlalchemy.orm import Mapper, selectinload
from src.environments import env
from src.models.roles import OrganizationRoles
from src.models.types import Image
from sqlalchemy.engine import Connection
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.models.statuses import Status
from longlink.permissions import Catalog
from src.database.session import session_scope
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation
from src.database.models.association import UserOrganization


def mock_image_metadata(monkeypatch: pytest.MonkeyPatch, metadata: LongLinkMetadata | None = None) -> None:
    """Patch image inspection with deterministic test metadata."""

    # Share one fake for the registry boundary; callers pass only meaningful variants.
    resolved = (
        metadata
        if metadata is not None
        else LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test"), permissions=Catalog(endpoints=[]))
    )

    async def inspect_image(_image: object, _connection: object | None = None) -> LongLinkMetadata:
        """Return the configured metadata response."""

        return resolved

    monkeypatch.setattr(images, "required_metadata", inspect_image)


async def test_list_apps_returns_requested_page_for_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Return only the requested administrator solution page."""

    # Arrange
    user = users[0]
    acme = await create_organization(user)
    globex = await create_organization(user, name="globex")
    solution = await create_solution(acme)
    await create_solution(globex, name="console")

    # Act
    paged_response = await clients[0].get("/api/v1/solutions?page=2&page_size=1")

    # Assert
    assert paged_response.status_code == 200
    payload = paged_response.json()
    assert [item["id"] for item in payload["items"]] == [str(solution.id)]
    assert payload["total"] == 2


async def test_list_solutions_omits_deleted_solutions_from_items_and_total(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Exclude deleted Solutions from administrator list results and totals."""

    # Arrange
    organization = await create_organization(users[0])
    active_solution = await create_solution(organization, name="active")
    deleted_solution = await create_solution(organization, name="deleted")
    delete_response = await clients[0].delete(f"/api/v1/solutions/{deleted_solution.id}")
    assert delete_response.status_code == 204

    # Act
    response = await clients[0].get("/api/v1/solutions")

    # Assert
    assert response.status_code == 200
    payload = response.json()
    assert [item["id"] for item in payload["items"]] == [str(active_solution.id)]
    assert payload["total"] == 1


async def test_create_app_persists_desired_state_and_queues_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Persist Solution desired state and queue its compute Operation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)
    mock_image_metadata(
        monkeypatch,
        LongLinkMetadata(
            permissions=Catalog(endpoints=[]),
            image=Image("ghcr.io/longlink/dashboard@sha256:test"),
            environments=[EnvironmentMetadata(name="API_KEY", required=True)],
        ),
    )

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={
            "name": "dashboard",
            "image": "ghcr.io/longlink/dashboard:latest",
            "description": "Dashboard app",
            "envs": {"API_KEY": "secret-value", "PORT": "8080"},
        },
    )

    # Assert
    assert response.status_code == 204

    async with session_scope() as session:
        persisted = await session.scalar(
            select(Solution).options(selectinload(Solution.desired_revision)).where(col(Solution.organization_id) == organization.id)
        )
        assert persisted is not None
        assert persisted.status == Status.creating
        assert persisted.description == "Dashboard app"
        assert (persisted.created_id, persisted.updated_id) == (user.id, user.id)

        # Creation persists the resolved image without preallocating runtime secrets.
        assert persisted.image_desired == "ghcr.io/longlink/dashboard@sha256:test"
        assert persisted.secrets == {}
        assert persisted.desired_revision.envs == {"API_KEY": "secret-value", "PORT": "8080"}
        assert (persisted.desired_revision.created_id, persisted.desired_revision.updated_id) == (user.id, user.id)
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.solution_deploy, col(Operation.target_id) == persisted.desired_revision_id
            )
        )
        assert operation is not None

        # Lifecycle work retains the authenticated command author's audit identity.
        assert (operation.created_id, operation.updated_id) == (user.id, user.id)


async def test_create_app_enforces_the_per_organization_beta_limit(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Allow ten solutions per organization and reject the eleventh."""

    # Arrange one Organization with image metadata available for every creation request.
    organization = await create_organization(users[0])
    mock_image_metadata(monkeypatch)

    # Act
    responses = [
        await clients[0].post(
            f"/api/v1/organizations/{organization.id}/solutions",
            json={"name": f"dashboard-{number}", "image": "ghcr.io/longlink/dashboard:latest"},
        )
        for number in range(11)
    ]

    # Assert
    assert [response.status_code for response in responses] == [204] * 10 + [409]
    assert responses[-1].json() == {"detail": "Solution limit reached during the beta. Contact LongLink to request additional solutions."}
    async with session_scope() as session:
        result = await session.scalars(select(Solution).where(col(Solution.organization_id) == organization.id))
        solutions = result.all()
    assert len(solutions) == 10


@pytest.mark.parametrize(
    ("metadata", "expected_status", "expected_detail"),
    [
        # Image inspection failures remain client-visible without creating a Solution.
        pytest.param(None, 404, "Image metadata not found", id="missing-metadata"),
        pytest.param(
            LongLinkMetadata(
                permissions=Catalog(endpoints=[]),
                image=Image("ghcr.io/longlink/dashboard@sha256:test"),
                environments=[EnvironmentMetadata(name="API_KEY", required=True)],
            ),
            422,
            # Valid image metadata can still require missing runtime configuration.
            "Solution environment does not satisfy required image variables: API_KEY",
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

    async def inspect_image(_client: AsyncClient, _image: Image, _base: str, _connection: object | None = None) -> LongLinkMetadata | None:
        """Keep missing-metadata translation real while returning the configured parser result."""

        return metadata

    monkeypatch.setattr(images, "inspect", inspect_image)
    previous_operations = await fetch_operations()

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions", json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"}
    )

    # Assert
    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}
    async with session_scope() as session:
        assert await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id)) is None
    await assert_no_new_operations(previous_operations)


async def test_create_app_checks_organization_access_before_validating_payload(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject missing Organization access even when the request body is malformed."""

    # Arrange
    organization_id = UUID(int=1)

    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Fail if invalid input reaches remote image inspection."""

        raise AssertionError("invalid solution payload must not inspect image metadata")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    response = await clients[1].post(f"/api/v1/organizations/{organization_id}/solutions", json={"name": "dashboard"})

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_create_app_rejects_non_member_without_creating_state(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject solution creation before image inspection for non-members."""

    # Arrange
    organization = await create_organization(users[0])
    previous_operations = await fetch_operations()

    # Prevent unauthorized requests from reaching the external registry boundary.
    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Fail if denied creation reaches remote image inspection."""

        raise AssertionError("denied solution creation must not inspect image metadata")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/solutions", json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"}
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}
    async with session_scope() as session:
        assert await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id)) is None
    await assert_no_new_operations(previous_operations)


async def test_create_app_rejects_duplicate_organization_slug_without_queuing_work(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject duplicate Solution slugs without adding a lifecycle operation."""

    # Arrange
    organization = await create_organization(users[0])
    await create_solution(organization, name="Dashboard")
    mock_image_metadata(monkeypatch)
    previous_operations = await fetch_operations()

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions", json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"}
    )

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Solution slug already exists"}
    async with session_scope() as session:
        result = await session.scalars(select(Solution).where(col(Solution.organization_id) == organization.id))
        solutions = result.all()
    assert len(solutions) == 1
    await assert_no_new_operations(previous_operations)


async def test_solution_responses_do_not_expose_environment_secrets(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Redact persisted Solution environment values from every response surface."""

    # Persist runtime-only values with environment names deliberately out of alphabetical order.
    owner = users[0]
    organization = await create_organization(owner)
    image = "ghcr.io/longlink/dashboard@sha256:first"
    await create_solution(organization, image=image, envs={"TOKEN": "runtime-secret", "API_KEY": "private-value"})

    # Resolve update metadata at the external boundary without registry I/O.
    async def metadata(image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Resolve latest and the current digest to the same immutable test image."""

        assert image in ("ghcr.io/longlink/dashboard:latest", "ghcr.io/longlink/dashboard@sha256:first")
        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:first"), permissions=Catalog(endpoints=[]))

    monkeypatch.setattr(images, "required_metadata", metadata)

    # Read the administrator list and Organization solution response surfaces.
    list_response = await clients[0].get("/api/v1/solutions")
    organization_response = await clients[0].get(f"/api/v1/organizations/{organization.id}/solutions")

    # Response models must omit both the secret field and its raw value.
    assert list_response.status_code == 200
    assert organization_response.status_code == 200
    list_solutions = list_response.json()["items"]
    organization_solutions = organization_response.json()
    assert all("secrets" not in item and "envs" not in item for item in list_solutions)
    assert all("secrets" not in item and "envs" not in item for item in organization_solutions)
    assert "runtime-secret" not in list_response.text
    assert "runtime-secret" not in organization_response.text
    assert "private-value" not in list_response.text
    assert "private-value" not in organization_response.text

    # The advisory update check must expose configured names without values.
    solution_id = list_solutions[0]["id"]
    check_response = await clients[0].get(f"/api/v1/solutions/{solution_id}/update")

    # Assert
    assert check_response.status_code == 200
    check_payload = check_response.json()
    assert check_payload["current_image"] == check_payload["metadata"]["image"] == image
    assert {"source", "image", "available"}.isdisjoint(check_payload)
    assert check_payload["configured_envs"] == ["API_KEY", "TOKEN"]
    assert "secrets" not in check_payload
    assert "envs" not in check_payload
    assert "runtime-secret" not in check_response.text
    assert "private-value" not in check_response.text


async def test_create_app_returns_403_for_regular_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject solution creation when the organization member lacks deployment permissions."""

    # Arrange
    owner = users[0]
    regular_member = users[1]
    organization = await create_organization(owner)
    await add_member(user=regular_member, organization=organization, role=OrganizationRoles.write)
    previous_operations = await fetch_operations()

    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Fail if denied creation reaches remote image inspection."""

        raise AssertionError("denied solution creation must not inspect image metadata")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/solutions", json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"}
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    async with session_scope() as session:
        assert await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id)) is None
    await assert_no_new_operations(previous_operations)


async def test_create_app_allows_maintainer(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Allow maintainers to create solutions."""

    # Arrange
    owner, maintainer = users[0], users[1]
    organization = await create_organization(owner)
    await add_member(user=maintainer, organization=organization, role=OrganizationRoles.maintain)
    mock_image_metadata(monkeypatch)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/solutions", json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"}
    )

    # Assert
    assert response.status_code == 204

    # Verify committed creation and deployment work belong to the authenticated maintainer.
    async with session_scope() as session:
        persisted = await session.scalar(
            select(Solution).options(selectinload(Solution.desired_revision)).where(col(Solution.organization_id) == organization.id)
        )
        assert persisted is not None
        assert (persisted.created_id, persisted.updated_id) == (maintainer.id, maintainer.id)
        assert persisted.desired_revision_id is not None
        assert persisted.desired_revision is not None
        assert persisted.desired_revision.solution_id == persisted.id

        # Attribute the immutable release to the authenticated command author.
        assert (persisted.desired_revision.created_id, persisted.desired_revision.updated_id) == (maintainer.id, maintainer.id)
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.solution_deploy, col(Operation.target_id) == persisted.desired_revision_id
            )
        )
        assert operation is not None
        assert (operation.created_id, operation.updated_id) == (maintainer.id, maintainer.id)


@pytest.mark.parametrize("client_index", [pytest.param(0, id="owner"), pytest.param(1, id="maintain-member")])
async def test_get_app_logs_returns_pod_logs(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    client_index: int,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return recent pod logs to owners and maintain members through their compute cluster."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)
    app = await create_solution(organization)
    await add_member(user=users[1], organization=organization, role=OrganizationRoles.maintain)
    captured: dict[str, UUID | str] = {}

    async def logs(client: object, organization_id: UUID, solution_id: UUID) -> list[str]:
        """Record the requested Solution and return its recent output."""

        captured["logs"] = solution_id
        captured["organization"] = organization_id
        return ["line 1", "line 2"]

    monkeypatch.setattr("src.routes.v1.solutions.Kubernetes", DatabaseKubernetes)
    monkeypatch.setattr("src.routes.v1.solutions.solution_resources.logs", logs)

    # Act
    response = await clients[client_index].get(f"/api/v1/solutions/{app.id}/logs")

    # Assert
    assert response.status_code == 200
    assert response.json() == ["line 1", "line 2"]
    assert captured["logs"] == app.id
    assert captured["organization"] == organization.id


@pytest.mark.parametrize(
    ("role", "expected_detail"),
    [
        pytest.param(None, "Access required", id="non-member"),
        pytest.param(OrganizationRoles.read, "Permission required", id="read-member"),
        # Write access alone cannot perform lifecycle maintenance.
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
    app = await create_solution(organization)
    if role is not None:
        await add_member(user=member, organization=organization, role=role)

    def unexpected_kubernetes(*_args: object) -> object:
        """Fail if authorization reaches the external cluster boundary."""

        raise AssertionError("Kubernetes client was constructed")

    monkeypatch.setattr("src.routes.v1.solutions.Kubernetes", unexpected_kubernetes)

    # Act
    response = await clients[1].get(f"/api/v1/solutions/{app.id}/logs")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": expected_detail}


@pytest.mark.parametrize("failure_stage", ["construction", "retrieval"])
async def test_app_logs_return_unavailable_when_backend_fails(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    failure_stage: str,
) -> None:
    """Hide provider diagnostics when client construction or log retrieval fails."""

    # Arrange
    owner = users[0]
    organization = await create_organization(owner)
    app = await create_solution(organization)

    def unavailable_kubernetes(_kubeconfig: object) -> DatabaseKubernetes:
        """Fail at the configured Kubernetes boundary."""

        # Keep construction and retrieval failures as distinct provider scenarios.
        if failure_stage == "construction":
            raise RuntimeError("cluster credential unavailable")
        return DatabaseKubernetes({})

    async def unavailable_logs(client: object, organization_id: UUID, solution_id: UUID) -> list[str]:
        """Fail retrieval separately from client construction."""

        raise RuntimeError("logs unavailable")

    monkeypatch.setattr("src.routes.v1.solutions.Kubernetes", unavailable_kubernetes)
    monkeypatch.setattr("src.routes.v1.solutions.solution_resources.logs", unavailable_logs)

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{app.id}/logs")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution logs unavailable"}
    assert "cluster credential unavailable" not in response.text


async def test_solution_logs_reject_deleted_solution_before_constructing_kubernetes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject runtime logs for deleted Solutions before reaching Kubernetes."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    delete_response = await clients[0].delete(f"/api/v1/solutions/{solution.id}")
    assert delete_response.status_code == 204

    def unexpected_kubernetes(*_args: object) -> object:
        """Fail if a deleted Solution reaches the cluster boundary."""

        raise AssertionError("Kubernetes client was constructed")

    monkeypatch.setattr("src.routes.v1.solutions.Kubernetes", unexpected_kubernetes)

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{solution.id}/logs")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_delete_solution_soft_deletes_and_queues_reconciliation(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Soft-delete a Solution and queue its reconciliation operation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)
    app = await create_solution(organization)

    # Act
    response = await clients[0].delete(f"/api/v1/solutions/{app.id}")

    # Assert
    assert response.status_code == 204
    async with session_scope() as session:
        deleted_solution = await session.get(Solution, app.id)
        operation = await session.scalar(
            select(Operation).where(col(Operation.kind) == OperationKind.solution_delete, col(Operation.target_id) == app.id)
        )
        assert deleted_solution is not None
        assert deleted_solution.deleted_at is not None
        assert deleted_solution.updated_at >= deleted_solution.deleted_at

        # Tombstone audit metadata identifies the authenticated deleting user.
        assert (deleted_solution.deleted_id, deleted_solution.updated_id) == (user.id, user.id)
        assert operation is not None
        assert (operation.created_id, operation.updated_id) == (user.id, user.id)


async def test_delete_solution_rejects_write_member_without_mutating_solution(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Reject write members from deleting a Solution or queueing cleanup."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    app = await create_solution(organization)
    await add_member(user=member, organization=organization, role=OrganizationRoles.write)

    # Act
    response = await clients[1].delete(f"/api/v1/solutions/{app.id}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    async with session_scope() as session:
        solution = await session.get(Solution, app.id)
        operation = await session.scalar(
            select(Operation).where(col(Operation.kind) == OperationKind.solution_delete, col(Operation.target_id) == app.id)
        )
        assert solution is not None
        assert solution.deleted_at is None

        # Rejected commands must not enqueue lifecycle work.
        assert operation is None


@pytest.mark.no_db
async def test_list_solutions_rejects_anonymous_without_admin_lookup(client: AsyncClient) -> None:
    """Reject unauthenticated solution listing before administrator checks."""

    # Act
    response = await client.get("/api/v1/solutions")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


async def test_create_solution_rejects_invalid_payload_without_mutating_state(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Reject malformed creation payloads before persisting Solution state or work."""

    # Arrange
    organization = await create_organization(users[0])
    previous_operations = await fetch_operations()

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest", "description": "x" * 256},
    )

    # Assert
    assert response.status_code == 422
    async with session_scope() as session:
        assert await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id)) is None
    await assert_no_new_operations(previous_operations)


async def test_create_solution_rejects_too_long_slug_without_queuing_work(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject valid-schema solution names whose slug exceeds the 63-character limit."""

    # Arrange
    organization = await create_organization(users[0])
    previous_operations = await fetch_operations()

    async def inspect_image(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Return valid immutable image metadata."""

        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test"), permissions=Catalog(endpoints=[]))

    monkeypatch.setattr(images, "required_metadata", inspect_image)

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions", json={"name": "a" * 70, "image": "ghcr.io/longlink/dashboard:latest"}
    )

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Invalid name"}
    async with session_scope() as session:
        assert await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id)) is None
    await assert_no_new_operations(previous_operations)


async def test_plugin_download_packages_only_the_selected_solution_without_credentials(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Allow a maintainer to download portable manifests without exporting runtime secrets."""

    # Arrange
    organization = await create_organization(users[0])
    other = await create_solution(organization, name="other-solution")
    solution = await create_solution(
        organization,
        name="selected-solution",
        envs={"API_KEY": "private-environment-value"},
        runtime_secrets={"LONGLINK_IDENTITY_SECRET": "private-identity-value"},
    )
    await add_member(user=users[1], organization=organization, role=OrganizationRoles.maintain)

    # Act
    response = await clients[1].get(f"/api/v1/solutions/{solution.id}/plugin")

    # Assert
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert response.headers["content-disposition"] == f'attachment; filename="longlink-{solution.id}.zip"'
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    archive = zipfile.ZipFile(io.BytesIO(response.content))
    with archive:
        assert set(archive.namelist()) == {"plugin.json", "mcp.json"}
        manifest = json.loads(archive.read("plugin.json"))

        # Inspect the MCP connection metadata from the actual exported archive.
        mcp = json.loads(archive.read("mcp.json"))

    # Verify the exported archive's public plugin contract.
    assert manifest["$schema"] == "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"
    assert manifest["name"] == f"longlink-{solution.id}"
    assert manifest["version"] == "1.0.0"
    assert manifest["extensions"]["com.openai"]["interface"]["displayName"] == solution.name
    assert mcp == {
        "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        "mcpServers": {
            f"longlink-{solution.id}": {"type": "streamable-http", "url": f"{env.PUBLIC_URL}/api/v1/solutions/{solution.id}/proxy/mcp"}
        },
    }

    # Exported plugin metadata must not include another tenant's identity.
    contents = json.dumps([manifest, mcp])
    assert str(other.id) not in contents
    assert "private-environment-value" not in contents
    assert "private-identity-value" not in contents


@pytest.mark.no_db
async def test_plugin_download_requires_authentication(client: AsyncClient) -> None:
    """Reject anonymous ZIP downloads before looking up Solution state."""

    # Act
    response = await client.get(f"/api/v1/solutions/{UUID(int=1)}/plugin")

    # Assert
    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated"}


@pytest.mark.parametrize("role", [OrganizationRoles.read, OrganizationRoles.write])
async def test_plugin_download_requires_maintenance_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], role: OrganizationRoles
) -> None:
    """Reject a valid Organization member below the ZIP download's maintenance boundary."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    await add_member(user=users[1], organization=organization, role=role)

    # Act
    authorized = await clients[0].get(f"/api/v1/solutions/{solution.id}/plugin")
    response = await clients[1].get(f"/api/v1/solutions/{solution.id}/plugin")

    # Assert
    assert authorized.status_code == 200
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}


async def test_plugin_download_rejects_cross_organization_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Keep an existing Solution's package inaccessible outside its Organization."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)

    # Act
    authorized = await clients[0].get(f"/api/v1/solutions/{solution.id}/plugin")
    response = await clients[2].get(f"/api/v1/solutions/{solution.id}/plugin")

    # Assert
    assert authorized.status_code == 200
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}


async def test_update_rejects_stale_revision(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject stale revision submissions before inspecting image metadata."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, envs={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}/update"

    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Fail if a stale submission reaches image resolution."""

        raise AssertionError("stale update must not inspect image metadata")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    stale_response = await clients[0].post(url, json={"expected_revision_id": str(uuid4())})

    # Assert
    assert stale_response.status_code == 409


async def test_update_rejects_solution_without_desired_revision(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject update inspection when the Solution has no desired revision snapshot."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    url = f"/api/v1/solutions/{solution.id}/update"
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        current.desired_revision_id = None
        await session.commit()

    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Fail if a revision-less candidate reaches image resolution."""

        raise AssertionError("revision-less update must not inspect image metadata")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    get_response = await clients[0].get(url)
    post_response = await clients[0].post(url, json={})

    # Assert
    assert get_response.status_code == 409
    assert get_response.json() == {"detail": "Solution has no desired revision"}
    assert post_response.status_code == 409
    assert post_response.json() == {"detail": "Solution has no desired revision"}


async def test_update_allows_unchanged_deployments(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Follow latest and preserve environment values while allowing unchanged deployments."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, envs={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}/update"
    source = "ghcr.io/longlink/dashboard:latest"
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:first"), permissions=Catalog(endpoints=[]))

    async def metadata(image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Require latest at the external registry boundary."""

        assert image == source
        return resolved

    monkeypatch.setattr(images, "required_metadata", metadata)

    # Verify the first update saves the resolved digest while preserving environment values.
    initial_response = await clients[0].post(url, json={})
    assert initial_response.status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        revision = await session.get(Revision, current.desired_revision_id)
        assert revision is not None
        assert revision.image == resolved.image
        assert revision.envs == {"KEEP": "private-value", "DROP": "old-value"}

    # Act
    unchanged_response = await clients[0].post(url, json={"envs": {"KEEP": "private-value"}})
    repeat_response = await clients[0].post(url, json={})

    # Assert
    assert unchanged_response.status_code == 204
    assert repeat_response.status_code == 204
    async with session_scope() as session:
        assert await session.scalar(select(func.count()).select_from(Revision).where(col(Revision.solution_id) == solution.id)) == 4


async def test_update_reresolves_moved_tag_and_enforces_required_envs(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Re-resolve a moved tag on submission and enforce its new required variables."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, envs={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}/update"
    source = "ghcr.io/longlink/dashboard:latest"
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:first"), permissions=Catalog(endpoints=[]))
    inspected: list[str] = []

    async def metadata(image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Resolve the current candidate metadata at the external boundary."""

        inspected.append(image)
        return resolved

    monkeypatch.setattr(images, "required_metadata", metadata)
    assert (await clients[0].post(url, json={})).status_code == 204

    # Act: the advisory check observes the moved tag without persisting it.
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:candidate"), permissions=Catalog(endpoints=[]))
    check = await clients[0].get(url)

    # Assert the check is advisory before enforcing the new requirements.
    assert check.json()["current_image"] == "ghcr.io/longlink/dashboard@sha256:first"
    assert check.json()["metadata"]["image"] == resolved.image

    # Arrange the final requirements.
    resolved = LongLinkMetadata(
        permissions=Catalog(endpoints=[]),
        image=Image("ghcr.io/longlink/dashboard@sha256:final"),
        environments=[EnvironmentMetadata(name="NEW", required=True), EnvironmentMetadata(name="KEEP", required=True)],
    )

    # Act
    missing = await clients[0].post(url, json={})
    invalid = await clients[0].post(url, json={"envs": {"LONGLINK_KEY": "private-value"}})
    keep_removed = await clients[0].post(url, json={"envs": {"NEW": "new-value", "KEEP": None}})
    success = await clients[0].post(url, json={"envs": {"NEW": "new-value", "DROP": None}})

    # Assert
    assert missing.status_code == 422
    assert "NEW" in missing.text
    assert invalid.status_code == 422
    assert "private-value" not in invalid.text
    assert keep_removed.status_code == 422
    assert success.status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None

        # Published releases use the inspected immutable image, not the mutable request tag.
        assert current.desired_revision.image == resolved.image

        # Environment patches preserve retained values in the new immutable snapshot.
        assert current.desired_revision.envs == {"KEEP": "private-value", "NEW": "new-value"}
        assert current.deployment_pending
        prior = await session.get(Revision, solution.desired_revision_id)
        assert prior is not None
        assert prior.envs == {"KEEP": "private-value", "DROP": "old-value"}
    assert inspected[-1] == source


# Update inspection requires active maintenance access.
UPDATE_CHECK_REJECTIONS = [
    pytest.param(None, 403, "Access required", id="non-member"),
    pytest.param(OrganizationRoles.read, 403, "Permission required", id="read-member"),
    pytest.param(OrganizationRoles.write, 403, "Permission required", id="write-member"),
]


@pytest.mark.parametrize(("role", "status", "detail"), UPDATE_CHECK_REJECTIONS)
async def test_update_check_rejects_callers_without_maintain_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    role: OrganizationRoles | None,
    status: int,
    detail: str,
) -> None:
    """Require maintain access before inspecting or re-resolving a desired release."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    if role is not None:
        async with session_scope() as session:
            session.add(UserOrganization(user_id=users[1].id, organization_id=organization.id, role=role))
            await session.commit()
    url = f"/api/v1/solutions/{solution.id}/update"

    async def unexpected_metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Fail if denied inspection reaches remote image resolution."""

        raise AssertionError("denied update check must not inspect image metadata")

    monkeypatch.setattr(images, "required_metadata", unexpected_metadata)

    # Act
    get_response = await clients[1].get(url)
    post_response = await clients[1].post(url, json={})

    # Assert
    assert get_response.status_code == status
    assert get_response.json() == {"detail": detail}
    assert post_response.status_code == status
    assert post_response.json() == {"detail": detail}


async def test_update_check_allows_maintainer_without_registry_oracle(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Allow maintainers to inspect the desired release source."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=users[1].id, organization_id=organization.id, role=OrganizationRoles.maintain))
        await session.commit()
    url = f"/api/v1/solutions/{solution.id}/update"

    async def metadata(image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Resolve metadata for the persisted source at the external boundary."""

        return LongLinkMetadata(image=image, permissions=Catalog(endpoints=[]))

    monkeypatch.setattr(images, "required_metadata", metadata)

    # Act
    response = await clients[1].get(url)

    # Assert
    assert response.status_code == 200
    assert response.json()["configured_envs"] == []


@pytest.mark.parametrize("method", ["GET", "POST"])
async def test_release_inspection_revalidates_concurrent_desired_changes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, method: str
) -> None:
    """Reject stale candidates without holding command locks across registry waits."""

    from src.database.services import solutions

    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:new"), permissions=Catalog(endpoints=[]))
    replacement_id = None

    async def inspect(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Commit a competing command while the original lookup is still waiting."""

        nonlocal replacement_id
        async with session_scope() as session:
            current = await solutions.access(session, solution.id, users[0].id)
            await solutions.deploy(session, current, users[0].id, metadata, {"OTHER": "concurrent-secret"})
            replacement_id = current.desired_revision_id
            await session.commit()
        return metadata

    # Suspend only registry inspection to exercise real optimistic revision checks.
    monkeypatch.setattr(images, "required_metadata", inspect)
    url = f"/api/v1/solutions/{solution.id}/update"
    response = await clients[0].request(method, url, json={})
    assert response.status_code == 409
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.desired_revision_id == replacement_id
        assert current.desired_revision.envs == {"OTHER": "concurrent-secret"}


# Recheck authorization after every unlocked metadata lookup.
@pytest.mark.parametrize(("method", "demotion_wait"), [("GET", 1), ("POST", 1), ("GET", 2)])
async def test_release_inspection_rejects_demotion_during_metadata_wait(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    method: str,
    demotion_wait: int,
) -> None:
    """Recheck committed membership after both candidate and old-digest inspection."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, envs={"KEEP": "private-value"})
    async with session_scope() as session:
        session.add(UserOrganization(user_id=users[1].id, organization_id=organization.id, role=OrganizationRoles.maintain))
        await session.commit()
        result = await session.scalars(select(col(Revision.id)).where(col(Revision.solution_id) == solution.id))
        previous_revisions = set(result.all())
    previous_operations = await fetch_operations()
    inspected: list[Image] = []

    # Keep the inspected candidate distinct from the concurrently desired image.
    candidate = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:candidate"), permissions=Catalog(endpoints=[]))

    async def metadata(image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Commit demotion while the request has released its registry-wait transaction."""

        # Revoke the otherwise valid maintainer at the selected external wait.
        inspected.append(image)
        if len(inspected) == demotion_wait:
            async with session_scope() as session:
                membership = await session.get(UserOrganization, (users[1].id, organization.id))
                assert membership is not None
                membership.role = OrganizationRoles.read
                await session.commit()

        # Later inspection observes the release changed by the competing command.
        return candidate if len(inspected) == 1 else LongLinkMetadata(image=image, permissions=Catalog(endpoints=[]))

    monkeypatch.setattr(images, "required_metadata", metadata)

    # Act
    response = await clients[1].request(
        method, f"/api/v1/solutions/{solution.id}/update", json={"expected_revision_id": str(solution.desired_revision_id)}
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    assert inspected == [Image("ghcr.io/longlink/dashboard:latest"), Image("ghcr.io/longlink/dashboard@sha256:test")][:demotion_wait]
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.desired_revision_id == solution.desired_revision_id
        assert current.desired_revision.envs == {"KEEP": "private-value"}
        result = await session.scalars(select(col(Revision.id)).where(col(Revision.solution_id) == solution.id))

        # Rejected updates must not leave an extra immutable revision behind.
        assert set(result.all()) == previous_revisions

    # Revision conflicts cannot schedule deployment work.
    await assert_no_new_operations(previous_operations)


async def test_update_rolls_back_revision_and_pointer_after_queue_insert_failure(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """A late queue write failure must leave the complete committed release unchanged."""

    from main import app

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, envs={"KEEP": "private-value"})
    async with session_scope() as session:
        result = await session.scalars(select(col(Revision.id)).where(col(Revision.solution_id) == solution.id))
        previous_revisions = set(result.all())
    previous_operations = await fetch_operations()
    inserted_targets: list[UUID] = []

    async def metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Provide a changed valid release at the metadata transport boundary."""

        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:candidate"), permissions=Catalog(endpoints=[]))

    def fail_insert(_mapper: Mapper[Operation], connection: Connection, operation: Operation) -> None:
        """Fail only after the real queue INSERT and release snapshot flush."""

        # Observe actual SQL persistence before interrupting the request transaction.
        assert connection.scalar(select(col(Revision.solution_id)).where(col(Revision.id) == operation.target_id)) == solution.id
        assert connection.scalar(select(col(Operation.id)).where(col(Operation.id) == operation.id)) == operation.id
        inserted_targets.append(operation.target_id)
        raise RuntimeError("queue INSERT failed")

    monkeypatch.setattr(images, "required_metadata", metadata)
    event.listen(Operation, "after_insert", fail_insert)
    try:

        # Act
        async with AsyncClient(
            transport=ASGITransport(app=app, raise_app_exceptions=False),
            base_url="http://testserver",
            cookies=clients[0].cookies,
            headers=clients[0].headers,
        ) as client:
            response = await client.post(
                f"/api/v1/solutions/{solution.id}/update",
                # Bind the patch to the revision read before the concurrent write.
                json={"expected_revision_id": str(solution.desired_revision_id), "envs": {"NEW": "new-value"}},
            )
    finally:

        # Restore the narrow late-write seam even if the request fails unexpectedly.
        event.remove(Operation, "after_insert", fail_insert)

    # Assert
    assert response.status_code == 500
    assert response.json() == {"detail": "An unexpected error occurred. Please try again later."}
    assert len(inserted_targets) == 1
    assert inserted_targets[0] not in previous_revisions
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.desired_revision_id == solution.desired_revision_id

        # A failed late write preserves the previously desired environment.
        assert current.desired_revision.envs == {"KEEP": "private-value"}
        result = await session.scalars(select(col(Revision.id)).where(col(Revision.solution_id) == solution.id))

        # A rejected command leaves the set of immutable revisions unchanged.
        assert set(result.all()) == previous_revisions
    await assert_no_new_operations(previous_operations)


async def test_environment_patch_validates_merged_limits(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Apply limits to preserved plus new values and permit explicit removals."""

    # Arrange
    organization = await create_organization(users[0])
    envs = {f"KEY_{index}": "value" for index in range(100)}
    solution = await create_solution(organization, envs=envs)
    image = Image("ghcr.io/longlink/dashboard@sha256:next")

    async def metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Provide a valid release without additional required variables."""

        return LongLinkMetadata(image=image, permissions=Catalog(endpoints=[]))

    monkeypatch.setattr(images, "required_metadata", metadata)
    url = f"/api/v1/solutions/{solution.id}/update"
    previous_operations = await fetch_operations()

    # Act
    response = await clients[0].post(url, json={"envs": {"NEW": "secret"}})

    # Assert
    assert response.status_code == 422
    assert response.json() == {"detail": "Solution environment contains too many variables"}
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.desired_revision_id == solution.desired_revision_id
        assert current.desired_revision.envs == envs
        assert await session.scalar(select(func.count()).select_from(Revision).where(col(Revision.solution_id) == solution.id)) == 1
    await assert_no_new_operations(previous_operations)

    # Verify explicit removal permits the otherwise rejected addition.
    assert (await clients[0].post(url, json={"envs": {"NEW": "", "KEY_0": None}})).status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert len(current.desired_revision.envs) == 100
        assert current.desired_revision.envs["NEW"] == ""
        assert "KEY_0" not in current.desired_revision.envs

    # Individually valid patches must also respect the byte limit after merging retained values.
    large_envs = {f"KEY_{index}": "x" * 32768 for index in range(15)}
    large = await create_solution(organization, name="large", envs=large_envs)
    previous_operations = await fetch_operations()

    # Act
    response = await clients[0].post(f"/api/v1/solutions/{large.id}/update", json={"envs": {"NEW": "x" * 32768}})

    # Assert
    assert response.status_code == 422
    assert response.json() == {"detail": "Solution environment is too large"}
    async with session_scope() as session:
        current = await session.get(Solution, large.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.desired_revision_id == large.desired_revision_id
        assert current.desired_revision.envs == large_envs
        assert await session.scalar(select(func.count()).select_from(Revision).where(col(Revision.solution_id) == large.id)) == 1
    await assert_no_new_operations(previous_operations)


async def test_simultaneous_source_updates_create_only_one_revision(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Serialize competing source updates on SQLite, including their preserved values."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, envs={"KEEP": "private-value"})
    barrier = asyncio.Barrier(2)

    async def metadata(_image: Image, _connection: object | None = None) -> LongLinkMetadata:
        """Let both commands inspect before either reacquires a command lock."""

        await asyncio.wait_for(barrier.wait(), timeout=5)
        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:new"), permissions=Catalog(endpoints=[]))

    monkeypatch.setattr(images, "required_metadata", metadata)
    url = f"/api/v1/solutions/{solution.id}/update"

    # Act
    responses = await asyncio.gather(
        clients[0].post(url, json={"envs": {"LEFT": "left"}}), clients[0].post(url, json={"envs": {"RIGHT": "right"}})
    )

    # Assert
    assert sorted(response.status_code for response in responses) == [204, 409]
    winning_patch = {"LEFT": "left"} if responses[0].status_code == 204 else {"RIGHT": "right"}
    expected_envs = {"KEEP": "private-value", **winning_patch}

    # Verify the successful request's complete snapshot was persisted.
    async with session_scope() as session:
        current = await session.get(Solution, solution.id, options=(selectinload(Solution.desired_revision),))
        assert current is not None
        assert current.desired_revision.envs == expected_envs
        assert await session.scalar(select(func.count()).select_from(Revision).where(col(Revision.solution_id) == solution.id)) == 2


@pytest.mark.integration
async def test_local_registry_release_roundtrip(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Exercise the real local registry without changing its tag or any development Platform state."""

    from src.utils import images

    # All Platform mutations use the isolated test database; registry requests are read-only.
    source = Image("localhost:15000/sample:latest")
    try:
        metadata = await images.required_metadata(source)
    except HTTPException as exc:

        # Only absence is expected when probing a deleted Solution.
        if exc.status_code != 404:
            raise
        pytest.skip("Local sample registry image is unavailable")
    if metadata.permissions is None:
        pytest.skip("Rebuild the local sample image with build-time permission metadata")
    organization = await create_organization(users[0])
    envs = {item.name: "integration-value" for item in metadata.environments}
    response = await clients[0].post(
        # Exercise creation with the metadata inspected from the local registry image.
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "Local sample", "image": source, "envs": envs},
    )
    assert response.status_code == 204
    listing = await clients[0].get(f"/api/v1/organizations/{organization.id}/solutions")
    assert listing.status_code == 200
    assert listing.json()[0]["deployment_pending"]
    solution_id = UUID(listing.json()[0]["id"])

    # Inspect the created sample through its public update-check endpoint.
    url = f"/api/v1/solutions/{solution_id}/update"
    check = await clients[0].get(url)
    assert check.status_code == 200

    # Update checks retain the resolved immutable image without legacy availability fields.
    assert check.json()["current_image"] == check.json()["metadata"]["image"] == metadata.image
    assert {"source", "image", "available"}.isdisjoint(check.json())
    assert "integration-value" not in check.text
    assert (await clients[0].post(url, json={})).status_code == 204
    assert (await clients[0].post(url, json={"envs": {"EXTRA": "replacement"}})).status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution_id)
        assert current is not None

        # Verify the local registry's resolved digest reached the persisted release snapshot.
        revision = await session.get(Revision, current.desired_revision_id)
        assert revision is not None
        assert revision.image == metadata.image
        assert revision.envs == {**envs, "EXTRA": "replacement"}
