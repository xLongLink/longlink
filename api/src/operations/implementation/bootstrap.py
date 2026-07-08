from src import compute as compute_runtime
from src import adapters
from src.logger import logger
from src.operations.implementation import registries
from src.database.services import organizations
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.users import User
from src.database.models.databases import DatabaseRegistry
from src.database.models.organizations import Organization


async def sync_organization_users(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    registry: DatabaseRegistry | None = None,
) -> None:
    """Synchronize organization members into the shared users schema."""

    database_registry = registry or await registries.organization_database_registry(organization)

    # Organizations without a database registry do not have a tenant database to synchronize.
    if database_registry is None:
        return

    db_client = adapters.database(database_registry)
    database_users = await organizations.database_users(organization.id)
    await db_client.sync_users(organization.slug, database_users)


async def sync_user_organizations(user: User) -> None:
    """Synchronize every organization database affected by one user."""

    # A profile update can affect every organization database where the user is a member.
    for organization in await organizations.list_by_user(user.id):
        await sync_organization_users(organization)


async def create_organization_namespace(organization: Organization | OrganizationSummary) -> None:
    """Best-effort create the organization namespace on the active compute registry."""

    registry = await registries.latest_compute_registry(organization.location_id)

    # Locations without compute are allowed during partial local setup.
    if registry is None:
        return

    # Bootstrap failures are logged but do not block organization creation.
    try:
        await compute_runtime.kubernetes(registry).namespace(organization.slug)

    # Organization creation remains successful even if runtime bootstrap needs manual repair.
    except Exception:
        logger.exception("Failed to create namespace for organization '%s'", organization.slug)


async def create_organization_database(organization: Organization | OrganizationSummary) -> None:
    """Best-effort create the organization database on the active database registry."""

    registry = await registries.latest_database_registry(organization.location_id)

    # Locations without a database are allowed during partial local setup.
    if registry is None:
        return

    # Bootstrap failures are logged but do not block organization creation.
    try:
        db_client = adapters.database(registry)
        await db_client.database(organization.slug)
        await db_client.sync_users(organization.slug, await organizations.database_users(organization.id))

    # Organization creation remains successful even if runtime bootstrap needs manual repair.
    except Exception:
        logger.exception("Failed to create database for organization '%s'", organization.slug)


async def create_organization_storage(organization: Organization | OrganizationSummary) -> None:
    """Best-effort create the assigned shared bucket on the active storage registry."""

    registry = await registries.latest_storage_registry(organization.location_id)

    # Locations without storage skip object-store bootstrap.
    if registry is None:
        return

    # Bootstrap failures are logged but do not block organization creation.
    try:
        storage_client = adapters.storage(registry)

        # The control plane assigns shared buckets when organizations are created.
        if organization.shared_storage_bucket_name is None:
            raise ValueError("Organization has no assigned shared storage bucket")

        await storage_client.bucket(organization.shared_storage_bucket_name)

    # Organization creation remains successful even if runtime bootstrap needs manual repair.
    except Exception:
        logger.exception("Failed to create storage for organization '%s'", organization.slug)
