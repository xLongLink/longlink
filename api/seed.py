import asyncio
import subprocess
from pathlib import Path
from pydantic import Field, field_validator
from src.utils import names, images
from sqlalchemy.exc import ArgumentError
from src.models.types import Image, DatabaseSSLMode
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from src.models.computes import ComputeRegistryCreate, kubeconfig_mapping
from src.models.statuses import Status
from src.database.services import users, compute, storage, database, operations, applications, organizations
from src.models.operations import OperationKind
from src.models.infrastructure import DatabaseConfiguration, exoscale_zone


class SeedSettings(BaseSettings):
    """Define development infrastructure registrations."""

    # Seeded Organization and Application
    LOCAL_ORG: str = Field(default="test", min_length=1)
    LOCAL_APP_NAME: str = Field(default="sample", min_length=1)
    LOCAL_ORG_AVATAR: str = Field(default="https://example.com/organizations/test.png", min_length=1)
    APPLICATION_IMAGE: str = Field(default="localhost:15000/longlink-app:dev", min_length=1)

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

    # Parse the configured PostgreSQL administrator URL at the seed boundary.
    try:
        database_url = make_url(settings.APPLICATION_DATABASE_URL)
    except (ArgumentError, ValueError):
        raise ValueError("Application database URL is invalid") from None
    if database_url.get_backend_name() != "postgresql":
        raise ValueError("Application database URL must use PostgreSQL")
    if set(database_url.query) - {"sslmode"}:
        raise ValueError("Application database URL only supports the sslmode query option")

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

    # Load relationship targets before the first ORM query configures SQLAlchemy mappers.
    from src.database.models import users as user_models
    from src.database.models import computes, storages, databases, association, invitations
    from src.database.models import applications as application_models
    from src.database.models import organizations as organization_models

    # Validate the configured Kubernetes compute before mutating Platform state.
    compute_config = ComputeRegistryCreate(
        name="development compute",
        kubeconfig=kubeconfig_mapping(settings.KUBECONFIG.read_text(encoding="utf-8")),
    )

    # Resolve either the configured Application database or the local PostgreSQL service.
    database_config = application_database_configuration(settings)

    # Create or validate the configured compute registry.
    compute_registry = next((item for item in await compute.fetch() if item.name == compute_config.name), None)
    if compute_registry is None:
        compute_registry = await compute.create(compute_config.name, compute_config.kubeconfig)
    elif compute_registry.kubeconfig != compute_config.kubeconfig:
        raise ValueError("Development compute registry uses a different kubeconfig; run make down before changing it")
    if compute_registry.status != Status.running:
        await operations.create(compute_registry.id, kind=OperationKind.compute_reconcile)

    # Create or validate the configured database registry.
    database_registry = next((item for item in await database.fetch() if item.name == "development database"), None)
    if database_registry is None:
        await database.create(
            "development database",
            database_config.host,
            database_config.port,
            database_config.username,
            database_config.password,
            database_config.sslmode,
        )
    elif (
        database_registry.host != database_config.host
        or database_registry.port != database_config.port
        or database_registry.username != database_config.username
        or database_registry.password != database_config.password
        or database_registry.sslmode != database_config.sslmode
    ):
        raise ValueError("Development database registry uses different settings; run make down before changing them")

    # Create or validate the configured storage registry.
    storage_registry = next((item for item in await storage.fetch() if item.name == "local storage"), None)
    if storage_registry is None:
        await storage.create(
            "local storage",
            settings.EXOSCALE_STORAGE_ENDPOINT_URL,
            settings.EXOSCALE_API_KEY,
            settings.EXOSCALE_API_SECRET,
        )
    elif (
        storage_registry.endpoint_url != settings.EXOSCALE_STORAGE_ENDPOINT_URL
        or storage_registry.access_key_id != settings.EXOSCALE_API_KEY
        or storage_registry.secret_access_key != settings.EXOSCALE_API_SECRET
    ):
        raise ValueError("Local storage registry uses different Exoscale settings; run make down before changing them")

    # Resolve the seeded Application image and Platform administrator before creating desired state.
    metadata = await images.metadata(Image(settings.APPLICATION_IMAGE))
    if metadata is None or metadata.digest is None:
        raise ValueError("Local Application image metadata not found")
    administrator, _ = await users.ensure_administrator()

    # Create the Organization before scheduling its lifecycle after compute reconciliation.
    organization = next((item for item in await organizations.fetch() if item.slug == settings.LOCAL_ORG), None)
    if organization is None:
        organization = await organizations.create(
            settings.LOCAL_ORG,
            settings.LOCAL_ORG,
            administrator,
            avatar=settings.LOCAL_ORG_AVATAR,
            compute_id=compute_registry.id,
            require_running_compute=False,
        )
    await operations.create(
        compute_registry.id,
        kind=OperationKind.organization_create,
        target_id=organization.id,
        delay_seconds=1,
    )

    # Create the seeded image state before scheduling deployment after Organization reconciliation.
    application_slug = names.slugify(settings.LOCAL_APP_NAME)
    application = next((item for item in await organizations.applications(organization.id) if item.slug == application_slug), None)
    if application is None:
        application = await applications.create(
            organization.id,
            settings.LOCAL_APP_NAME,
            application_slug,
            metadata.image,
            administrator,
            sdk=metadata.sdk,
            version=metadata.version,
            description="Local SDK development application",
            require_ready=False,
        )
    elif application.image != metadata.image or application.sdk != metadata.sdk or application.version != metadata.version:
        application = await applications.replace_image(
            application.id,
            metadata.image,
            administrator,
            sdk=metadata.sdk,
            version=metadata.version,
        )
        if application is None:
            raise RuntimeError("Seeded Application disappeared during image replacement")
    await operations.create(
        compute_registry.id,
        kind=OperationKind.application_create,
        target_id=application.id,
        delay_seconds=2,
    )


def main() -> None:
    """Seed local development resources from a synchronous entrypoint."""

    # Load the configured infrastructure before registering it.
    asyncio.run(seed_local_development(SeedSettings()))


if __name__ == "__main__":
    main()
