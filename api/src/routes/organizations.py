from fastapi import Depends, HTTPException
from src.auth import authuser, authadmin
from src.logger import logger
from src.router import router
from src.models.organizations import OrgCreate, OrgDetails, OrgSummary
from src.adapters.compute.k8s import K8s
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.organizations import orgs


@router.get("/api/orgs", response_model=list[OrgSummary])
async def list_organizations(_user: User = Depends(authadmin)) -> list[OrgSummary]:
    """Return all organizations for admin views."""

    return await orgs.list()


@router.get("/api/orgs/{name}", response_model=OrgDetails)
async def get_organization(
    name: str,
    user: User = Depends(authuser),
) -> OrgDetails:
    """Return one organization and its metadata."""

    # Deny access early when the org does not exist.
    organization = await orgs.get(name)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    # Keep organization reads scoped to the caller's memberships.
    if not any(org.name == name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

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
        registry = max(registries, key=lambda r: r.id)
        k8s = K8s(registry.kubeconfig, registry.proxy_secret)
        try:
            await k8s.namespace(payload.name)
        except Exception:
            logger.exception("Failed to create namespace for org '%s'", payload.name)

    return organization


@router.delete("/api/orgs/{name}", status_code=204)
async def delete_organization(name: str, user: User = Depends(authuser)) -> None:
    """Delete one org by name."""

    # Only members can delete their own org.
    if not any(org.name == name for org in user.orgs):
        raise HTTPException(status_code=404, detail=f"Org '{name}' not found")

    await orgs.delete(name)
    return
