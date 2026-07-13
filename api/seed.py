import asyncio
import subprocess
from uuid import UUID
from pathlib import Path
from datetime import UTC, datetime
from src.utils import names
from src.routes import organizations as organization_routes
from src.runtime import provisioning as resources
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
from src.database.services import organizations as organization_service
from src.runtime.kubernetes import Kubernetes
from src.models.applications import ApplicationCreate
from longlink.tenant.database import users as tenant_users
from src.models.organizations import OrganizationCreate
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.association import UserOrganization

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"
LOCAL_ADMIN_OIDC = "00000000-0000-0000-0000-000000000001"
LOCAL_ADMIN_NAME = "Example LongLink"
LOCAL_ADMIN_EMAIL = "example@longlink.dev"
LOCAL_COMPUTE_GATEWAY_URL = "http://localhost:8080"
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
        # Load the reused local registry row before updating its endpoint.
        registry = await session.get(DatabaseRegistry, registry_id)
        if registry is None:
            raise RuntimeError("Local database registry could not be loaded")

        registry.host = host
        registry.port = LOCAL_DATABASE_PORT
        await session.commit()


async def sync_local_compute_gateway_url(registry_id: UUID) -> None:
    """Update the local compute registry gateway URL after development port changes."""

    # Update only the reused local compute registry row.
    async with session_scope() as session:
        # Load the reused local compute registry before updating its gateway URL.
        registry = await session.get(ComputeRegistry, registry_id)
        if registry is None:
            raise RuntimeError("Local compute registry could not be loaded")

        registry.gateway_url = LOCAL_COMPUTE_GATEWAY_URL
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
                    role=OrganizationRoles.owner,
                    created_id=user_id,
                    updated_id=user_id,
                )
            )
        else:
            # Reusing old local data should not leave the fixed dev administrator locked out.
            membership.role = OrganizationRoles.owner
            membership.deleted_at = None
            membership.deleted_id = None
            membership.updated_at = now
            membership.updated_id = user_id

        await session.commit()


async def seed_local_development() -> None:
    """Seed the local platform database and runtime resources."""

    admin_user = await seed_local_administrator()

    # Location
    location_slug = names.slugify("local")
    locations = await location_service.fetch()
    # Find the local location before deciding whether to create it.
    location = next((location for location in locations if location.slug == location_slug), None)
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
    # Find the local database registry before deciding whether to create or refresh it.
    database_registry = next((registry for registry in database_registries if registry.name == "local"), None)
    if database_registry is None:
        database_registry = await database_service.create(
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
        database_registry.host = database_host
        database_registry.port = LOCAL_DATABASE_PORT

    # Runtime organization repair needs the local database registry URL details.
    if database_registry is None:
        raise RuntimeError("Local database registry could not be loaded")

    # Storage registry
    storage_registries = await storage_service.fetch()

    # Register local object storage when it is not already configured.
    if not any(registry.name == "local" for registry in storage_registries):
        await storage_service.create(
            kind=StorageKind.minio,
            name="local",
            slug=names.slugify("local"),
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
    # Find the local compute registry before deciding whether to create or refresh it.
    compute_registry = next(
        (registry for registry in compute_registries if registry.name == "local" or registry.gateway_url == LOCAL_COMPUTE_GATEWAY_URL),
        None,
    )
    if compute_registry is None:
        compute_registry = await compute_service.create(
            name="local",
            slug=names.slugify("local"),
            kubeconfig=kubeconfig,
            gateway_url=LOCAL_COMPUTE_GATEWAY_URL,
            location_id=location.id,
            user=admin_user,
        )
        await Kubernetes(compute_registry.kubeconfig, compute_registry.proxy_secret).sync_gateway()

    # Reused registries may need their gateway URL refreshed after port changes.
    elif compute_registry.gateway_url != LOCAL_COMPUTE_GATEWAY_URL:
        await sync_local_compute_gateway_url(compute_registry.id)

    # Organization
    organizations = await organization_service.fetch()
    # Find the local organization before deciding whether to create or repair it.
    organization = next((organization for organization in organizations if organization.name == LOCAL_ORG), None)
    reused_organization = organization is not None
    if organization is None:
        # Use the organization endpoint implementation so seed creation follows API runtime bootstrap.
        organization = await organization_routes.create_organization(
            OrganizationCreate(
                name=LOCAL_ORG,
                avatar=LOCAL_ORG_AVATAR,
                country="CH",
                location_id=location.id,
            ),
            admin_user,
        )

    # Reused organizations need owner and shared-user state repaired.
    else:
        await ensure_local_organization_owner(organization.id, admin_user.id)

    # Application
    # Load the full organization row required by runtime provisioning.
    organization_record = await organization_service.get(organization.id)
    if organization_record is None:
        raise RuntimeError("Seeded organization could not be loaded")

    # Reused organizations need shared-user state repaired after owner repair.
    if reused_organization:
        if organization_record.shared_schema_url is None:
            raise RuntimeError("Seeded organization has no shared schema URL")
        await tenant_users.sync_url(organization_record.shared_schema_url, await organization_service.database_users(organization_record.id))

    application_payload = ApplicationCreate.model_validate(LOCAL_APP)
    application_slug = names.slugify(LOCAL_APP_NAME)

    # Application storage isolation depends on deterministic runtime resource names.
    names.organization_shared_bucket(organization_record.slug)
    names.application_bucket(organization_record.slug, application_slug)

    # Load the sample app before deciding whether to create or refresh it.
    organization_applications = await organization_service.applications(organization_record.id)
    application = next((application for application in organization_applications if application.slug == application_slug), None)
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
