from src import auth
from uuid import UUID
from fastapi import Query, Depends, APIRouter, HTTPException
from collections.abc import Sequence
from src.models.resources import OrganizationIdentity
from src.database.services import organizations
from src.models.pagination import Page, Pagination
from src.models.organizations import OrganizationQuotasResponse
from src.database.models.organizations import Organization

router = APIRouter()


@router.get("/organizations", response_model=Page[OrganizationIdentity])
async def list_organizations(
    session: auth.Session, pagination: Pagination = Depends(), search: str = Query(default="", max_length=200)
) -> dict[str, Sequence[Organization] | int]:
    """Return all organizations for administrator views."""

    # Search the full administrator listing before pagination.
    items, total = await organizations.fetch(session, pagination, search.strip())
    return {"items": items, "total": total}


@router.get("/organizations/{organization_id}/quotas", response_model=OrganizationQuotasResponse)
async def get_organization_quotas(session: auth.Session, organization_id: UUID) -> dict[str, UUID | int]:
    """Return Organization quotas for administrator views."""

    # Read Organization quotas without touching provider boundaries.
    organization = await session.get(Organization, organization_id)
    if organization is None or organization.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Preserve legacy quota units and round up without losing allocated bytes.
    return {
        "id": organization.id,
        "database_size_mib": (organization.database_storage_bytes + 1024**2 - 1) // 1024**2,
        "database_instances": 1,
        "storage_quota_bytes": organization.storage_bytes,
    }
