from pathlib import Path
from sqlmodel import col
from sqlalchemy import func, select
from scripts.seed import SeedSettings, CloudSeedSettings, seed_cloud, seed_local_development
from src.environments import env
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.applications import Application
from src.database.models.organizations import Organization


def settings(tmp_path: Path, settings_type: type[SeedSettings] = SeedSettings) -> SeedSettings:
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
    return settings_type(
        KUBECONFIG=kubeconfig,
        APPLICATION_DATABASE_URL="postgresql://admin:admin@database:5432/postgres?sslmode=disable",
        EXOSCALE_API_KEY="access-key",
        EXOSCALE_API_SECRET="secret-key",
        EXOSCALE_STORAGE_ENDPOINT_URL="https://sos-ch-gva-2.exo.io",
    )


async def count(model: type[object]) -> int:
    """Return the number of persisted rows for one model."""

    async with session_scope() as session:
        result = await session.execute(select(func.count()).select_from(model))
        return result.scalar_one()


async def test_local_seed_creates_administrator_and_example(tmp_path: Path) -> None:
    """Keep local seed resources stable across repeated initialization."""

    # Arrange
    local_settings = settings(tmp_path)

    # Act
    await seed_local_development(local_settings)
    await seed_local_development(local_settings)

    # Assert
    assert await count(User) == 1
    assert await count(ComputeRegistry) == 1
    assert await count(DatabaseRegistry) == 1
    assert await count(StorageRegistry) == 1
    assert await count(Organization) == 1
    assert await count(Application) == 1
    async with session_scope() as session:
        administrator = await session.scalar(select(User).where(User.email == env.ADMIN_EMAIL))
        application = await session.scalar(select(Application).where(col(Application.slug) == "sample"))
    assert administrator is not None
    assert administrator.administrator is True
    assert application is not None
    assert application.description == "A sample application for local development."


async def test_cloud_seed_registers_only_infrastructure(tmp_path: Path) -> None:
    """Create only infrastructure registries for a cloud deployment."""

    # Act
    await seed_cloud(settings(tmp_path, CloudSeedSettings))

    # Assert
    assert await count(ComputeRegistry) == 1
    assert await count(DatabaseRegistry) == 1
    assert await count(StorageRegistry) == 1
    assert await count(User) == 0
    assert await count(Organization) == 0
    assert await count(Application) == 0
