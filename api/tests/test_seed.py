import pytest
from uuid import UUID
from pathlib import Path
from conftest import TEST_PASSWORD, create_client
from sqlmodel import col
from sqlalchemy import func, select
from dev.scripts.seed import SeedSettings, seed
from src.environments import env
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
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
        GATEWAY_URL="https://gateway.example",
        DATABASE_STORAGE_CLASS="local-path",
        STORAGE_CLASS="block-storage",
        STORAGE_ENDPOINT="https://storage.example",
        BUCKET_SIZE_BYTES=134217728,
        BUCKET_MAX_OBJECTS=1000,
        STORAGE_RESERVE_PERCENT=30,
        STORAGE_OBJECT_OVERHEAD_BYTES=65536,
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

    # Act
    async with create_client(administrator) as client:
        compute_response = await client.post(
            "/api/v1/computes",
            json={
                "name": "development compute",
                "kubeconfig": local_settings.KUBECONFIG.read_text(encoding="utf-8"),
                "gateway_url": local_settings.GATEWAY_URL,
                "database_storage_class": local_settings.DATABASE_STORAGE_CLASS,
                "storage_class": local_settings.STORAGE_CLASS,
                "storage_endpoint": local_settings.STORAGE_ENDPOINT,
                "bucket_size_bytes": local_settings.BUCKET_SIZE_BYTES,
                "bucket_max_objects": local_settings.BUCKET_MAX_OBJECTS,
                "storage_reserve_percent": local_settings.STORAGE_RESERVE_PERCENT,
                "storage_object_overhead_bytes": local_settings.STORAGE_OBJECT_OVERHEAD_BYTES,
            },
        )
        assert compute_response.status_code == 202
        async with session_scope() as session:
            compute = await session.get(ComputeRegistry, UUID(compute_response.json()["id"]))
            assert compute is not None
            compute.status = Status.running
            await session.commit()

        await seed(local_settings, client)
        await seed(local_settings, client)

    # Assert
    assert await count(ComputeRegistry) == 1
    assert await count(Organization) == 1
    assert await count(Solution) == 1
    async with session_scope() as session:
        solution = await session.scalar(select(Solution).where(col(Solution.slug) == "sample"))
    assert solution is not None
    assert solution.description == "A sample solution for local development."
    assert solution.desired_revision.source == "localhost:15000/sample:dev"
