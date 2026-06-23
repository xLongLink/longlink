from uuid import UUID
from fastapi import Depends, APIRouter
from src.auth import authuser, authadmin, authsupport
from src.errors import ConflictError, NotFoundError
from src.logger import logger
from src.adapters.compute.k8s import K8s
from src.models.organizations import (OrganizationCreate, OrganizationDetails,
                                      OrganizationSummary)
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.organizations import organizations

router = APIRouter()


@router.get("/api/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authsupport)) -> list[OrganizationSummary]:
    """Return all organizations for support and administrator views."""

    return await organizations.list()


@router.get("/api/organizations/{org_id}", response_model=OrganizationDetails)
async def get_organization(
    org_id: UUID,
    user: User = Depends(authuser),
) -> OrganizationDetails:
    """Return one organization and its metadata."""

    # Deny access early when the org does not exist.
    organization = await organizations.get(org_id)
    if organization is None:
        raise NotFoundError("Organization", org_id)

    # Keep organization reads scoped to the caller's memberships.
    if not any(organization.id == org_id for organization in user.organizations):
        raise NotFoundError("Organization", org_id)

    return organization


@router.post("/api/organizations", response_model=OrganizationSummary)
async def create_organization(
    payload: OrganizationCreate,
    user: User = Depends(authuser),
) -> OrganizationSummary:
    """Create a new organization."""

    # Map uniqueness failures to a conflict response.
    try:
        organization = await organizations.create(payload.name, payload.location_id, user, payload.avatar)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    # Create the Kubernetes namespace for the org when a compute cluster is available
    # at the same location.  This is best-effort: if no compute registry exists yet the
    # namespace will be created lazily when the first app is deployed.
    registries = [r for r in await compute.list() if r.location_id == payload.location_id]
    if registries:
        registry = max(registries, key=lambda r: r.created_at)
        k8s = K8s(registry.kubeconfig, registry.proxy_secret)
        try:
            await k8s.namespace(organization.slug)
        except Exception:
            logger.exception("Failed to create namespace for organization '%s'", organization.slug)

    return organization


@router.delete("/api/organizations/{org_id}", status_code=204)
async def delete_organization(org_id: UUID, user: User = Depends(authuser)) -> None:
    """Delete one organization by id."""

    # Only members can delete their own org.
    organization = next((organization for organization in user.organizations if organization.id == org_id), None)
    if organization is None:
        raise NotFoundError("Organization", org_id)

    registries = [registry for registry in await compute.list() if registry.location_id == organization.location_id]
    if registries:
        registry = max(registries, key=lambda item: item.created_at)
        k8s = K8s(registry.kubeconfig, registry.proxy_secret)
        try:
            await k8s.delete(organization.slug)
        except Exception:
            logger.exception("Failed to delete namespace for organization '%s'", organization.slug)

    await organizations.delete(org_id, user.id)
    return
