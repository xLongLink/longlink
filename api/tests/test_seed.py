import pytest
import asyncio
import contextlib
from uuid import UUID
from pathlib import Path
from conftest import TEST_PASSWORD, DatabasePostgres, StorageKubernetes, DatabaseKubernetes, create_client
from sqlmodel import col
from src.utils import jobs
from sqlalchemy import func, select
from dev.scripts.seed import SeedSettings, seed
from src.environments import env
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


def settings(tmp_path: Path, administrator_email: str) -> SeedSettings:
    """Build valid seed settings with a temporary compute configuration."""

    kubeconfig = tmp_path / "kubeconfig.yml"
    kubeconfig.write_text(
        "apiVersion: v1\n"
        "clusters:\n- name: cluster\n  cluster:\n    server: https://kubernetes.example\n"
        "contexts:\n- name: context\n  context:\n    cluster: cluster\n    user: user\n"
        "current-context: context\n"
        "users:\n- name: user\n  user:\n    token: secret\n",
        encoding="utf-8",
    )
    return SeedSettings(
        KUBECONFIG=kubeconfig,
        ADMIN_EMAIL=administrator_email,
        ADMIN_PASSWORD=TEST_PASSWORD,
        PUBLIC_URL=env.PUBLIC_URL,
    )


async def count(model: type[object]) -> int:
    """Return the number of persisted rows for one model."""

    async with session_scope() as session:
        result = await session.execute(select(func.count()).select_from(model))
        return result.scalar_one()


async def test_local_seed_creates_example_through_api(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    users: tuple[User, User, User],
    database_runtime: None,
) -> None:
    """Keep local seed resources stable across repeated initialization."""

    # Arrange
    administrator = users[0]
    local_settings = settings(tmp_path, str(administrator.email))

    # Isolate registry transport from the workstation's mutable sample tag.
    async def metadata(image: Image) -> LongLinkMetadata:
        """Resolve the seed through the same metadata boundary as deployment."""

        assert image == "localhost:15000/sample:dev"
        return LongLinkMetadata(image=Image("localhost:15000/sample@sha256:resolved"))

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)

    async def verify_gateway(_cluster: object, _url: str, _certificate: str | None, **_kwargs: object) -> None:
        """Accept the configured gateway connection."""

    class Solutions:
        """Accept Solution workload provisioning."""

        async def apply(self, *_args: object, **_kwargs: object) -> None:
            """Accept the requested workload."""

    class Organizations:
        """Accept Organization boundary provisioning."""

        async def apply(self, *_args: object, **_kwargs: object) -> None:
            """Accept the requested Organization boundary."""

    class Kubernetes(DatabaseKubernetes):
        """Expose every lifecycle provider boundary without external I/O."""

        def __init__(self, *_args: object) -> None:
            """Initialize the test provider facades."""

            super().__init__()
            self.solutions = Solutions()
            self.organizations = Organizations()

        async def cluster_uid(self) -> str:
            """Return the identity submitted by the test Compute."""

            return "https://kubernetes.example"

    class Postgres(DatabasePostgres):
        """Provide the Solution schema operation used during deployment."""

        async def solution_schema(self, _organization_id: UUID, solution_id: UUID, _password: str) -> str:
            """Return the scoped database username for the Solution."""

            return solution_id.hex

    monkeypatch.setattr("src.routes.v1.computes.Kubernetes", Kubernetes)
    monkeypatch.setattr("src.routes.v1.computes.gateway.verify", verify_gateway)
    monkeypatch.setattr("src.routes.v1.computes.Storage", StorageKubernetes)
    monkeypatch.setattr("src.operations.databases.Kubernetes", Kubernetes)
    monkeypatch.setattr("src.operations.organizations.Kubernetes", Kubernetes)
    monkeypatch.setattr("src.operations.organizations.Storage", StorageKubernetes)
    monkeypatch.setattr("src.operations.solutions.Kubernetes", Kubernetes)
    monkeypatch.setattr("src.operations.solutions.Storage", StorageKubernetes)
    monkeypatch.setattr("src.operations.databases.postgres.Postgres", Postgres)

    # Act
    scheduler = asyncio.create_task(jobs.run_operation_scheduler())
    try:
        async with create_client(administrator) as client:
            compute_response = await client.post(
                "/api/v1/computes",
                json={
                    "name": "development compute",
                    "kubeconfig": local_settings.KUBECONFIG.read_text(encoding="utf-8"),
                    "gateway_url": "https://gateway.example",
                    "database_storage_class": "local-path",
                    "storage_endpoint": "https://storage.example",
                },
            )
            assert compute_response.status_code == 201
            await seed(local_settings, client)
            await seed(local_settings, client)
    finally:
        scheduler.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await scheduler

    # Assert
    assert await count(ComputeRegistry) == 1
    assert await count(Organization) == 1
    assert await count(Solution) == 1
    async with session_scope() as session:
        solution = await session.scalar(select(Solution).where(col(Solution.slug) == "sample"))
    assert solution is not None
    assert solution.description == "A sample solution for local development."
    assert solution.desired_revision.source == "localhost:15000/sample:dev"
