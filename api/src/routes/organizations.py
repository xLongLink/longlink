from fastapi import Depends, HTTPException
from src.auth import authuser, authadmin, authsupport
from src.logger import logger
from src.router import router
from src.models.organizations import OrgCreate, OrgDetails, OrgSummary
from src.adapters.compute.k8s import K8s
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.organizations import orgs


@router.get("/api/orgs", response_model=list[OrgSummary])
async def list_organizations(_user: User = Depends(authsupport)) -> list[OrgSummary]:
    """Return all organizations for support and administrator views."""

    return await orgs.list()


@router.get("/api/orgs/{org_id}", response_model=OrgDetails)
async def get_organization(
    org_id: str,
    user: User = Depends(authuser),
) -> OrgDetails:
    """Return one organization and its metadata."""

    # Deny access early when the org does not exist.
    organization = await orgs.get(org_id)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Org '{org_id}' not found")

    # Keep organization reads scoped to the caller's memberships.
    if not any(org.id == org_id for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{org_id}' not found")

    return organization


@router.post("/api/orgs", response_model=OrgSummary)
async def create_organization(
    payload: OrgCreate,
    user: User = Depends(authuser),
) -> OrgSummary:
    """Create a new org."""

    # Map uniqueness failures to a conflict response.
    try:
        organization = await orgs.create(payload.name, payload.location_id, user, payload.avatar)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    # Create the Kubernetes namespace for the org when a compute cluster is available
    # at the same location.  This is best-effort: if no compute registry exists yet the
    # namespace will be created lazily when the first app is deployed.
    registries = [r for r in await compute.list() if r.deleted_at is None and r.location_id == payload.location_id]
    if registries:
        registry = max(registries, key=lambda r: r.created_at)
        k8s = K8s(registry.kubeconfig, registry.proxy_secret)
        try:
            await k8s.namespace(organization.id)
        except Exception:
            logger.exception("Failed to create namespace for org '%s'", organization.id)

    return organization


@router.delete("/api/orgs/{org_id}", status_code=204)
async def delete_organization(org_id: str, user: User = Depends(authuser)) -> None:
    """Delete one org by id."""

    # Only members can delete their own org.
    if not any(org.id == org_id for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{org_id}' not found")

    await orgs.delete(org_id)
    return
