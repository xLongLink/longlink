import asyncio
from pathlib import Path
from typing import cast
from uuid import UUID
from datetime import UTC, datetime
from sqlalchemy import select
from sqlalchemy.sql.elements import ColumnElement
from src import compute as compute_runtime
from src.utils import names, buckets
from src.environments import env
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.computes import ComputeKind
from src.models.storages import StorageKind
from src.models.locations import LocationProvider
from src.models.databases import DatabaseKind
from src.models.applications import ApplicationCreate
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.association import UserOrganization
from src.database.models.computes import ComputeRegistry
from src.database.services import users
from src.database.services import compute as compute_service
from src.database.services import storage as storage_service
from src.database.services import database as database_service
from src.database.services import locations as location_service
from src.database.services import applications as application_service
from src.database.services import organizations as organization_service
from src.operations.implementation import bootstrap, resources

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"
LOCAL_ADMIN_OIDC = "00000000-0000-0000-0000-000000000001"
LOCAL_ADMIN_NAME = "Example LongLink"
LOCAL_ADMIN_EMAIL = "example@longlink.dev"
LOCAL_COMPUTE_INGRESS_HOST = "http://localhost:8080"
LOCAL_APP_NAME = "sample"

LOCAL_APP = {
    "name": LOCAL_APP_NAME,
    "image": env.LOCAL_APPLICATION_IMAGE,
    "description": "Local SDK development application",
    "icon": "rocket",
    "envs": {"REQUIRED": "local-development"},
}
KUBECONFIG = Path(__file__).with_name("kubeconfig.yaml")


async def sync_local_compute_ingress_host(registry_id: UUID) -> None:
    """Update the local compute registry gateway host after development port changes."""

    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, registry_id)
        if registry is None:
            raise RuntimeError("Local compute registry could not be loaded")

        registry.ingress_host = LOCAL_COMPUTE_INGRESS_HOST
        await session.commit()


async def seed_local_administrator() -> User:
    """Create or adopt the fixed local administrator account."""

    async with session_scope() as session:
        email_filter = cast(ColumnElement[bool], User.email == LOCAL_ADMIN_EMAIL)
        result = await session.execute(select(User).where(email_filter))
        admin_user = result.scalars().first()
        if admin_user is not None:

            # Older local databases used Keycloak's generated subject for this same dev account.
            admin_user.oidc = LOCAL_ADMIN_OIDC
            admin_user.name = LOCAL_ADMIN_NAME
            admin_user.role = PlatformRoles.administrator
            admin_user.deleted_at = None
            await session.commit()
            await session.refresh(admin_user)
            return admin_user

    return await users.upsert(
        oidc=LOCAL_ADMIN_OIDC,
        email=LOCAL_ADMIN_EMAIL,
        name=LOCAL_ADMIN_NAME,
        role=PlatformRoles.administrator,
    )


async def ensure_local_organization_owner(organization_id: UUID, user_id: UUID) -> None:
    """Grant the fixed local administrator owner access to a reused organization."""

    async with session_scope() as session:
        membership = await session.get(
            UserOrganization,
            {"organization_id": organization_id, "user_id": user_id},
        )
        now = datetime.now(UTC)

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
    locations = await location_service.fetch_all()
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
    database_registries = await database_service.fetch_all()
    if not any(registry.name == "local" for registry in database_registries):
        await database_service.create(
            kind=DatabaseKind.postgresql,
            name="local",
            slug=names.slugify("local"),
            host="localhost",
            port=15432,
            username="admin",
            password="admin",
            location_id=location.id,
            user=admin_user,
        )

    # Storage registry
    storage_registries = await storage_service.fetch_all()
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
    compute_registries = await compute_service.fetch_all()
    compute_registry = next(
        (
            registry
            for registry in compute_registries
            if registry.name == "local" or registry.ingress_host == LOCAL_COMPUTE_INGRESS_HOST
        ),
        None,
    )
    if compute_registry is None:
        compute_registry = await compute_service.create(
            kind=ComputeKind.kubernetes,
            name="local",
            slug=names.slugify("local"),
            kubeconfig=kubeconfig,
            ingress_host=LOCAL_COMPUTE_INGRESS_HOST,
            location_id=location.id,
            user=admin_user,
        )
        await compute_runtime.kubernetes(compute_registry).setup()
    elif compute_registry.ingress_host != LOCAL_COMPUTE_INGRESS_HOST:
        await sync_local_compute_ingress_host(compute_registry.id)

    # Organization
    organizations = await organization_service.fetch_all()
    organization = next((organization for organization in organizations if organization.name == LOCAL_ORG), None)
    if organization is None:
        organization_slug = names.slugify(LOCAL_ORG, "Organization")
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
    else:
        await ensure_local_organization_owner(organization.id, admin_user.id)
        await bootstrap.sync_organization_users(organization)

    # Application
    organization_details = await organization_service.get(organization.id)
    if organization_details is None:
        raise RuntimeError("Seeded organization could not be loaded")

    application_payload = ApplicationCreate.model_validate(LOCAL_APP)
    application_slug = names.slugify(LOCAL_APP_NAME, "Application name")
    names.knames(organization_details.slug, "Organization")
    names.knames(application_slug, "Application name")
    names.k8name(organization_details.slug)
    names.dbname(organization_details.slug)
    if organization_details.shared_storage_bucket_name is None:
        raise RuntimeError("Seeded organization has no assigned shared storage bucket")
    buckets.application(organization_details.slug, application_slug)

    application = await application_service.get(organization_details.id, application_slug)
    if application is None:
        await resources.create_application_runtime(
            organization_details,
            application_slug,
            application_payload,
            admin_user,
        )
    else:
        await resources.sync_application_runtime(
            application,
            organization_details,
            application_payload,
            admin_user,
        )


def main() -> None:
    """Seed local development resources from a synchronous entrypoint."""

    asyncio.run(seed_local_development())


if __name__ == "__main__":
    main()
