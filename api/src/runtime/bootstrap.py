from src import adapters
from src.utils import names
from tenant.database import SHARED_SCHEMA
from tenant.database import users as tenant_users
from src.database.services import registries, organizations
from src.models.organizations import OrganizationDetails, OrganizationSummary
from src.database.models.databases import DatabaseRegistry
from src.database.models.organizations import Organization


async def sync_organization_users(
    organization: Organization | OrganizationDetails | OrganizationSummary,
    registry: DatabaseRegistry | None = None,
) -> None:
    """Synchronize organization members into the shared users schema."""

    # Organization user synchronization requires a database registry attached to the location.
    registry = registry or await registries.database(organization.location_id)
    if registry is None:
        raise RuntimeError("No database configured")

    users = await organizations.database_users(organization.id)
    db = adapters.database(registry)
    database_name = names.organization_database(organization.slug)

    # Shared organization users are owned by the tenant library, not the API database adapter.
    async with db.connection(database_name, search_path=SHARED_SCHEMA) as conn:
        await tenant_users.sync(conn, users)
