import asyncio
import subprocess
from src import compute as compute_runtime
from uuid import UUID
from pathlib import Path
from datetime import UTC, datetime
from src.utils import names, buckets
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.storages import StorageKind
from src.database.session import session_scope
from src.models.databases import DatabaseKind
from src.models.locations import LocationProvider
from src.database.services import users
from src.database.services import compute as compute_service
from src.database.services import storage as storage_service
from src.database.services import database as database_service
from src.database.services import locations as location_service
from src.database.services import applications as application_service
from src.database.services import organizations as organization_service
from src.models.applications import ApplicationCreate
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.databases import DatabaseRegistry
from src.operations.implementation import bootstrap, resources
from src.database.models.association import UserOrganization

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"
LOCAL_ADMIN_OIDC = "00000000-0000-0000-0000-000000000001"
LOCAL_ADMIN_NAME = "Example LongLink"
LOCAL_ADMIN_EMAIL = "example@longlink.dev"
LOCAL_COMPUTE_INGRESS_HOST = "http://localhost:8080"
LOCAL_DATABASE_PORT = 15432
LOCAL_DOCKER_NETWORK = "k3d-compute"
LOCAL_APPLICATION_IMAGE = "localhost:15000/longlink-app:dev"
LOCAL_APP_NAME = "sample"

LOCAL_APP = {
    "name": LOCAL_APP_NAME,
    "image": LOCAL_APPLICATION_IMAGE,
    "description": "Local SDK development application",
    "icon": "rocket",
    "envs": {"REQUIRED": "local-development"},
}
KUBECONFIG = Path(__file__).with_name("kubeconfig.yaml")


def local_database_host() -> str:
    """Return the local Docker host address reachable from k3d app pods and the API process."""

    result = subprocess.run(
        ["docker", "network", "inspect", LOCAL_DOCKER_NETWORK, "--format", "{{range .IPAM.Config}}{{.Gateway}}{{end}}"],
        capture_output=True,
        check=True,
        text=True,
    )
    database_host = result.stdout.strip()

    # The Docker network must expose a gateway that app pods can reach.
    if not database_host:
        raise RuntimeError(f"Docker network '{LOCAL_DOCKER_NETWORK}' has no gateway address")

    return database_host


async def sync_local_database_host(registry_id: UUID, host: str) -> None:
    """Update the local database registry endpoint after local network changes."""

    # Update only the reused local registry row.
    async with session_scope() as session:
        registry = await session.get(DatabaseRegistry, registry_id)

        # Missing local rows indicate stale seed assumptions.
        if registry is None:
            raise RuntimeError("Local database registry could not be loaded")

        registry.host = host
        registry.port = LOCAL_DATABASE_PORT
        await session.commit()


async def sync_local_compute_ingress_host(registry_id: UUID) -> None:
    """Update the local compute registry gateway host after development port changes."""

    # Update only the reused local compute registry row.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, registry_id)

        # Missing local rows indicate stale seed assumptions.
        if registry is None:
            raise RuntimeError("Local compute registry could not be loaded")

        registry.ingress_host = LOCAL_COMPUTE_INGRESS_HOST
        await session.commit()


async def seed_local_administrator() -> User:
    """Create or update the fixed local administrator account."""

    return await users.upsert(
        oidc=LOCAL_ADMIN_OIDC,
        email=LOCAL_ADMIN_EMAIL,
        name=LOCAL_ADMIN_NAME,
        role=PlatformRoles.administrator,
    )


async def ensure_local_organization_owner(organization_id: UUID, user_id: UUID) -> None:
    """Grant the fixed local administrator owner access to a reused organization."""

    # Repair reused local organizations after account reseeding.
    async with session_scope() as session:
        membership = await session.get(
            UserOrganization,
            {"organization_id": organization_id, "user_id": user_id},
        )
        now = datetime.now(UTC)

        # Create the owner membership when old local data lacks it.
        if membership is None:
            session.add(
                UserOrganization(
                    user_id=user_id,
                    organization_id=organization_id,
                    role_name=OrganizationRoles.owner,
                    created_id=user_id,
                    updated_id=user_id,
                )
            )
        else:

            # Reusing old local data should not leave the fixed dev administrator locked out.
            membership.role_name = OrganizationRoles.owner
            membership.deleted_at = None
            membership.deleted_id = None
            membership.updated_at = now
            membership.updated_id = user_id

        await session.commit()


async def seed_local_development() -> None:
    """Seed the local control-plane database and runtime resources."""

    admin_user = await seed_local_administrator()

    # Location
    location_slug = names.slugify("local")
    locations = await location_service.fetch()
    location = next((location for location in locations if location.slug == location_slug), None)

    # Create the local location when the development database is empty.
    if location is None:
        location = await location_service.create(
            location_slug,
            "local",
            admin_user,
            "CH",
            LocationProvider.local,
        )

    # Database registry
    database_host = local_database_host()
    database_registries = await database_service.fetch()
    database_registry = next((registry for registry in database_registries if registry.name == "local"), None)

    # Register the local database endpoint on first seed.
    if database_registry is None:
        await database_service.create(
            kind=DatabaseKind.postgresql,
            name="local",
            slug=names.slugify("local"),
            host=database_host,
            port=LOCAL_DATABASE_PORT,
            username="admin",
            password="admin",
            location_id=location.id,
            user=admin_user,
        )

    # Keep reused local databases aligned with the current k3d network.
    elif database_registry.host != database_host or database_registry.port != LOCAL_DATABASE_PORT:
        await sync_local_database_host(database_registry.id, database_host)

    # Storage registry
    storage_registries = await storage_service.fetch()

    # Register local object storage when it is not already configured.
    if not any(registry.name == "local" for registry in storage_registries):
        await storage_service.create(
            kind=StorageKind.s3,
            name="local",
            slug=names.slugify("local"),
            protocol="http",
            endpoint_url="http://localhost:19000",
            runtime_endpoint_url="http://host.k3d.internal:19000",
            access_key_id="admin",
            secret_access_key="adminadmin",
            location_id=location.id,
            user=admin_user,
        )

    # Compute registry
    kubeconfig = KUBECONFIG.read_text(encoding="utf-8")
    compute_registries = await compute_service.fetch()
    compute_registry = next(
        (
            registry
            for registry in compute_registries
            if registry.name == "local" or registry.ingress_host == LOCAL_COMPUTE_INGRESS_HOST
        ),
        None,
    )

    # Create or repair the local compute registry for gateway routing.
    if compute_registry is None:
        compute_registry = await compute_service.create(
            name="local",
            slug=names.slugify("local"),
            kubeconfig=kubeconfig,
            ingress_host=LOCAL_COMPUTE_INGRESS_HOST,
            location_id=location.id,
            user=admin_user,
        )
        await compute_runtime.kubernetes(compute_registry).setup()

    # Reused registries may need their gateway host refreshed after port changes.
    elif compute_registry.ingress_host != LOCAL_COMPUTE_INGRESS_HOST:
        await sync_local_compute_ingress_host(compute_registry.id)

    # Organization
    organizations = await organization_service.fetch()
    organization = next((organization for organization in organizations if organization.name == LOCAL_ORG), None)

    # Create and bootstrap the local organization on first seed.
    if organization is None:
        organization_slug = names.slugify(LOCAL_ORG)
        names.k8name(organization_slug)
        names.dbname(organization_slug)
        buckets.shared(organization_slug)
        organization = await organization_service.create(
            LOCAL_ORG,
            organization_slug,
            location.id,
            admin_user,
            LOCAL_ORG_AVATAR,
            country="CH",
        )
        await bootstrap.create_organization_namespace(organization)
        await bootstrap.create_organization_database(organization)
        await bootstrap.create_organization_storage(organization)

    # Reused organizations need owner and shared-user state repaired.
    else:
        await ensure_local_organization_owner(organization.id, admin_user.id)
        await bootstrap.sync_organization_users(organization)

    # Application
    organization_record = await organization_service.get_record(organization.id)

    # Runtime provisioning needs a fully loaded organization row.
    if organization_record is None:
        raise RuntimeError("Seeded organization could not be loaded")

    application_payload = ApplicationCreate.model_validate(LOCAL_APP)
    application_slug = names.slugify(LOCAL_APP_NAME)
    names.knames(organization_record.slug)
    names.knames(application_slug)
    names.k8name(organization_record.slug)
    names.dbname(organization_record.slug)

    # Application storage isolation depends on the assigned shared bucket.
    if organization_record.shared_storage_bucket_name is None:
        raise RuntimeError("Seeded organization has no assigned shared storage bucket")
    buckets.application(organization_record.slug, application_slug)

    application = await application_service.get(organization_record.id, application_slug)

    # Create the sample app the first time the seed runs.
    if application is None:
        await resources.create_application_runtime(
            organization_record,
            application_slug,
            application_payload,
            admin_user,
        )

    # Reused sample apps should refresh their runtime image and metadata.
    else:
        await resources.sync_application_runtime(
            application,
            organization_record,
            application_payload,
            admin_user,
        )


def main() -> None:
    """Seed local development resources from a synchronous entrypoint."""

    asyncio.run(seed_local_development())


# Allow the seed module to run directly in local development.
if __name__ == "__main__":
    main()
