from src import adapters
from src.logger import logger
from src.database.services import registries, organizations
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.databases import DatabaseRegistry
from src.runtime import Kubernetes
from src.database.models.organizations import Organization


async def sync_organization_users(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    registry: DatabaseRegistry | None = None,
) -> None:
    """Synchronize organization members into the shared users schema."""

    # Organizations without a database registry do not have a tenant database to synchronize.
    registry = registry or await registries.database(organization.location_id)
    if registry is None:
        return

    db = adapters.database(registry)
    users = await organizations.database_users(organization.id)
    await db.sync_users(organization.slug, users)


async def create_organization_namespace(organization: Organization | OrganizationSummary) -> None:
    """Best-effort create the organization namespace on the active compute registry."""

    # Locations without compute are allowed during partial local setup.
    registry = await registries.compute(organization.location_id)
    if registry is None:
        return

    # Bootstrap failures are logged but do not block organization creation.
    try:
        await Kubernetes(registry.kubeconfig, registry.proxy_secret).namespace(organization.slug)

    # Organization creation remains successful even if runtime bootstrap needs manual repair.
    except Exception as exc:
        logger.exception("Failed to create namespace for organization '%s': %r", organization.slug, exc)


async def create_organization_database(organization: Organization | OrganizationSummary) -> None:
    """Best-effort create the organization database on the active database registry."""

    # Locations without a database are allowed during partial local setup.
    registry = await registries.database(organization.location_id)
    if registry is None:
        return

    # Bootstrap failures are logged but do not block organization creation.
    try:
        await sync_organization_users(organization, registry)

    # Organization creation remains successful even if runtime bootstrap needs manual repair.
    except Exception as exc:
        logger.exception("Failed to create database for organization '%s': %r", organization.slug, exc)


async def create_organization_storage(organization: Organization | OrganizationSummary) -> None:
    """Best-effort create the assigned shared bucket on the active storage registry."""

    # Locations without storage skip object-store bootstrap.
    registry = await registries.storage(organization.location_id)
    if registry is None:
        return

    # Bootstrap failures are logged but do not block organization creation.
    try:
        storage = adapters.storage(registry)

        # The control plane assigns shared buckets when organizations are created.
        if organization.shared_storage_bucket_name is None:
            raise ValueError("Organization has no assigned shared storage bucket")

        await storage.bucket(organization.shared_storage_bucket_name)

    # Organization creation remains successful even if runtime bootstrap needs manual repair.
    except Exception as exc:
        logger.exception("Failed to create storage for organization '%s': %r", organization.slug, exc)
