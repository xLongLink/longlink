import pytest
from uuid import UUID
from httpx2 import AsyncClient
from sqlmodel import col
from factories import create_solution, fetch_operations, create_organization
from sqlalchemy import select
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.solutions import Solution
from src.database.models.operations import Operation
from src.database.models.association import UserOrganization


class FakeCompute:
    """Fake Kubernetes log client with a configured result."""

    def __init__(self, outcome: list[str] | RuntimeError, captured: dict[str, UUID | str]) -> None:
        """Expose the solution log client and its configured outcome."""

        self.solutions = self
        self.outcome = outcome
        self.captured = captured

    async def logs(self, solution_id: UUID, namespace: str) -> list[str]:
        """Record a request and return or raise the configured outcome."""

        self.captured["logs"] = solution_id
        self.captured["namespace"] = namespace
        if isinstance(self.outcome, RuntimeError):
            raise self.outcome
        return self.outcome

    async def aclose(self) -> None:
        """Provide the Kubernetes client cleanup contract."""


async def test_list_apps_returns_requested_page_for_admin(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Return only the requested administrator solution page."""

    # Arrange
    user = users[0]
    acme = await create_organization(user)
    globex = await create_organization(user, name="globex")
    await create_solution(acme)
    console = await create_solution(globex, name="console")

    # Act
    paged_response = await clients[0].get("/api/v1/solutions?page=2&page_size=1")

    # Assert
    assert paged_response.status_code == 200
    payload = paged_response.json()
    assert [item["id"] for item in payload["items"]] == [str(console.id)]
    assert payload["total"] == 2


async def test_list_solutions_omits_deleted_solutions_from_items_and_total(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
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
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Persist Solution desired state and queue its compute Operation."""

    # Arrange
    user = users[0]
    organization = await create_organization(user)

    async def inspect_image(_image: str) -> LongLinkMetadata:
        """Return immutable metadata with one required user environment value."""

        return LongLinkMetadata(
            image=Image("ghcr.io/longlink/dashboard@sha256:test"),
            environments=[EnvironmentMetadata(name="API_KEY", required=True)],
        )

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", inspect_image)

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
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
        persisted = await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id))
        assert persisted is not None
        assert persisted.status == Status.creating
        assert persisted.description == "Dashboard app"
        assert persisted.image_desired == "ghcr.io/longlink/dashboard@sha256:test"
        assert persisted.secrets == {"API_KEY": "secret-value", "PORT": "8080"}
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.solution_create,
                col(Operation.target_id) == persisted.id,
            )
        )
        assert operation is not None


async def test_create_app_enforces_the_per_organization_beta_limit(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Allow three solutions per organization and reject the fourth."""

    # Arrange one Organization with image metadata available for every creation request.
    organization = await create_organization(users[0])

    async def inspect_image(_image: Image) -> LongLinkMetadata:
        """Return valid deployable image metadata without a registry request."""

        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test"))

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", inspect_image)

    # Act
    responses = [
        await clients[0].post(
            f"/api/v1/organizations/{organization.id}/solutions",
            json={"name": f"dashboard-{number}", "image": "ghcr.io/longlink/dashboard:latest"},
        )
        for number in range(4)
    ]

    # Assert
    assert [response.status_code for response in responses] == [204, 204, 204, 409]
    assert responses[-1].json() == {
        "detail": "Solution limit reached during the beta. Contact LongLink to request additional solutions."
    }
    async with session_scope() as session:
        result = await session.scalars(select(Solution).where(col(Solution.organization_id) == organization.id))
        solutions = result.all()
    assert len(solutions) == 3


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

    async def inspect_image(_image: Image) -> LongLinkMetadata | None:
        """Return the configured metadata response."""

        return metadata

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", inspect_image)
    operation_ids = [operation.id for operation in await fetch_operations()]

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == expected_status
    assert response.json() == {"detail": expected_detail}
    async with session_scope() as session:
        assert await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id)) is None
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

        raise AssertionError("invalid solution payload must not inspect image metadata")

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", unexpected_metadata)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard"},
    )

    # Assert
    assert response.status_code == 422


async def test_create_app_rejects_non_member_without_creating_state(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject solution creation before image inspection for non-members."""

    # Arrange
    organization = await create_organization(users[0])
    operation_ids = [operation.id for operation in await fetch_operations()]

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Access required"}
    async with session_scope() as session:
        assert await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id)) is None
    assert [operation.id for operation in await fetch_operations()] == operation_ids


async def test_create_app_rejects_duplicate_organization_slug_without_queuing_work(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Reject duplicate Solution slugs without adding a lifecycle operation."""

    # Arrange
    organization = await create_organization(users[0])
    await create_solution(organization, name="Dashboard")
    operation_ids = [operation.id for operation in await fetch_operations()]

    async def inspect_image(_image: Image) -> LongLinkMetadata:
        """Return valid immutable image metadata."""
        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:test"))

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", inspect_image)

    # Act
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 409
    assert response.json() == {"detail": "Solution slug already exists"}
    async with session_scope() as session:
        result = await session.scalars(select(Solution).where(col(Solution.organization_id) == organization.id))
        solutions = result.all()
    assert len(solutions) == 1
    assert [operation.id for operation in await fetch_operations()] == operation_ids


async def test_solution_responses_do_not_expose_environment_secrets(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Redact persisted Solution environment values from every response surface."""

    # Persist one Solution with a value that must remain runtime-only.
    owner = users[0]
    organization = await create_organization(owner)
    await create_solution(organization, secrets={"API_KEY": "runtime-secret"})

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


async def test_create_app_returns_403_for_regular_member(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject solution creation when the organization member lacks deployment permissions."""

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
        f"/api/v1/organizations/{organization.id}/solutions",
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
    """Allow maintainers to create solutions and queue their deployment."""

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

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", inspect_image)

    # Act
    response = await clients[1].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={"name": "dashboard", "image": "ghcr.io/longlink/dashboard:latest"},
    )

    # Assert
    assert response.status_code == 204
    async with session_scope() as session:
        solution = await session.scalar(select(Solution).where(col(Solution.organization_id) == organization.id))
        assert solution is not None
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.solution_create,
                col(Operation.target_id) == solution.id,
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
    app = await create_solution(organization)
    captured: dict[str, UUID | str] = {}
    monkeypatch.setattr("src.routes.v1.solutions.Kubernetes", lambda _kubeconfig: FakeCompute(["line 1", "line 2"], captured))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{app.id}/logs")

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
    app = await create_solution(organization)
    if role is not None:
        async with session_scope() as session:
            session.add(UserOrganization(user_id=member.id, organization_id=organization.id, role=role))
            await session.commit()

    def unexpected_kubernetes(*_args: object) -> object:
        """Fail if authorization reaches the external cluster boundary."""

        raise AssertionError("Kubernetes client was constructed")

    monkeypatch.setattr("src.routes.v1.solutions.Kubernetes", unexpected_kubernetes)

    # Act
    response = await clients[1].get(f"/api/v1/solutions/{app.id}/logs")

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
    app = await create_solution(organization)
    monkeypatch.setattr("src.routes.v1.solutions.Kubernetes", lambda _kubeconfig: FakeCompute(RuntimeError("logs unavailable"), {}))

    # Act
    response = await clients[0].get(f"/api/v1/solutions/{app.id}/logs")

    # Assert
    assert response.status_code == 503
    assert response.json() == {"detail": "Solution logs unavailable"}


async def test_solution_logs_reject_deleted_solution_before_constructing_kubernetes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
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
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
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
            select(Operation).where(
                col(Operation.kind) == OperationKind.solution_delete,
                col(Operation.target_id) == app.id,
            )
        )
        assert deleted_solution is not None
        assert deleted_solution.deleted_at is not None
        assert operation is not None


async def test_delete_solution_rejects_write_member_without_mutating_solution(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
) -> None:
    """Reject write members from deleting a Solution or queueing cleanup."""

    # Arrange
    owner, member = users[0], users[1]
    organization = await create_organization(owner)
    app = await create_solution(organization)
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
    response = await clients[1].delete(f"/api/v1/solutions/{app.id}")

    # Assert
    assert response.status_code == 403
    assert response.json() == {"detail": "Permission required"}
    async with session_scope() as session:
        solution = await session.get(Solution, app.id)
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.solution_delete,
                col(Operation.target_id) == app.id,
            )
        )
        assert solution is not None
        assert solution.deleted_at is None
        assert operation is None
