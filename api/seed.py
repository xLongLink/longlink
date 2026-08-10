import asyncio
import subprocess
from pathlib import Path
from pydantic import Field, field_validator
from contextlib import suppress
from src.errors import ConflictError
from src.models.types import DatabaseSSLMode
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from src.models.computes import ComputeRegistryCreate
from src.database.session import session_scope
from src.database.services import compute, storage, database
from src.models.infrastructure import DatabaseConfiguration, exoscale_zone


class SeedSettings(BaseSettings):
    """Define development infrastructure registrations."""

    # Compute registry
    KUBECONFIG: Path = Path(__file__).with_name("kubeconfig.yaml")

    # Database registry
    APPLICATION_DATABASE_URL: str | None = None
    LOCAL_DATABASE_PORT: int = Field(default=15432, ge=1, le=65535)
    LOCAL_DOCKER_NETWORK: str = Field(default="longlink-dev", min_length=1)

    # Storage registry
    EXOSCALE_API_KEY: str = Field(min_length=1)
    EXOSCALE_API_SECRET: str = Field(min_length=1)
    EXOSCALE_STORAGE_ENDPOINT_URL: str = Field(min_length=1)

    model_config = SettingsConfigDict(
        env_file=".env.seed",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("EXOSCALE_STORAGE_ENDPOINT_URL")
    @classmethod
    def validate_storage_endpoint(cls, value: str) -> str:
        """Require a supported Exoscale SOS endpoint."""

        # Reject unsupported providers and malformed Exoscale endpoint URLs at the seed boundary.
        exoscale_zone(value)
        return value


def local_database_host(settings: SeedSettings) -> str:
    """Return the local Docker host address reachable from k3d application pods."""

    # Resolve the current network gateway because Docker can change it after recreation.
    result = subprocess.run(
        ["docker", "network", "inspect", settings.LOCAL_DOCKER_NETWORK, "--format", "{{range .IPAM.Config}}{{.Gateway}}{{end}}"],
        capture_output=True,
        check=True,
        text=True,
    )
    host = result.stdout.strip()
    if not host:
        raise RuntimeError(f"Docker network '{settings.LOCAL_DOCKER_NETWORK}' has no gateway address")
    return host


def application_database_configuration(settings: SeedSettings) -> DatabaseConfiguration:
    """Return the validated Application database registry configuration."""

    # Use the isolated Docker PostgreSQL service when no remote database is configured.
    if settings.APPLICATION_DATABASE_URL is None:
        return DatabaseConfiguration(
            host=local_database_host(settings),
            port=settings.LOCAL_DATABASE_PORT,
            username="admin",
            password="admin",
            sslmode=DatabaseSSLMode.disable,
        )

    # Parse a PostgreSQL administrator URL with the supported connection option.
    database_url = make_url(settings.APPLICATION_DATABASE_URL)
    if database_url.get_backend_name() != "postgresql" or set(database_url.query) - {"sslmode"}:
        raise ValueError("Application database URL must use PostgreSQL and only supports the sslmode query option")

    # Validate all connection fields before persisting administrator credentials.
    try:
        return DatabaseConfiguration.model_validate(
            {
                "host": database_url.host or "",
                "port": database_url.port or 5432,
                "username": database_url.username or "",
                "password": database_url.password or "",
                "sslmode": database_url.query.get("sslmode", DatabaseSSLMode.require.value),
            }
        )
    except ValueError:
        raise ValueError("Application database URL has invalid connection settings") from None


async def seed_local_development(settings: SeedSettings) -> None:
    """Register development infrastructure from seed settings."""

    # Load the Organization relationship target before the first ORM query configures SQLAlchemy mappers.
    from src.database.models import applications

    # Validate the configured Kubernetes compute before mutating Platform state.
    compute_config = ComputeRegistryCreate.model_validate(
        {"name": "development compute", "kubeconfig": settings.KUBECONFIG.read_text(encoding="utf-8")}
    )

    # Resolve either the configured Application database or the local PostgreSQL service.
    database_config = application_database_configuration(settings)

    # Register the configured compute and queue its reconciliation when newly created.
    with suppress(ConflictError):
        async with session_scope() as session:
            await compute.create(session, compute_config.name, compute_config.kubeconfig)
            await session.commit()

    # Register the configured database unless it already exists.
    with suppress(ConflictError):
        async with session_scope() as session:
            await database.create(
                session,
                "development database",
                database_config.host,
                database_config.port,
                database_config.username,
                database_config.password,
                database_config.sslmode,
            )
            await session.commit()

    # Register the configured storage unless it already exists.
    with suppress(ConflictError):
        async with session_scope() as session:
            await storage.create(
                session,
                "local storage",
                settings.EXOSCALE_STORAGE_ENDPOINT_URL,
                settings.EXOSCALE_API_KEY,
                settings.EXOSCALE_API_SECRET,
            )
            await session.commit()


def main() -> None:
    """Seed local development resources from a synchronous entrypoint."""

    # Load the configured infrastructure before registering it.
    asyncio.run(seed_local_development(SeedSettings()))


if __name__ == "__main__":
    main()
