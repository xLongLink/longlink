from src import adapters
from src.database.services import registries, organizations
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.databases import DatabaseRegistry
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
