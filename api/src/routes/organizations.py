from uuid import UUID
from fastapi import Depends, Response, APIRouter
from src.auth import authuser, authsupport, organization_access
from src.errors import ConflictError, NotFoundError, ForbiddenError
from src.logger import logger
from src.models.roles import PlatformRoles, OrganizationRoles
from src.models.common import SuccessResponse
from src.models.applications import ApplicationResponse
from src.adapters.compute.k8s import K8s
from src.models.organizations import (OrganizationCreate, OrganizationDetails,
                                      OrganizationSummary,
                                      OrganizationInvitationCreate)
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.invitations import invitations
from src.database.services.applications import applications
from src.database.services.organizations import organizations

router = APIRouter()


@router.get("/api/organizations", response_model=list[OrganizationSummary])
async def list_organizations(_user: User = Depends(authsupport)) -> list[OrganizationSummary]:
    """Return all organizations for support and administrator views."""

    return await organizations.list()


@router.get("/api/organizations/{organization_id}", response_model=OrganizationDetails)
async def get_organization(organization_id: UUID, user: User = Depends(authuser)) -> OrganizationDetails:
    """Return one organization and its metadata."""

    return await organization_access(organization_id, user)


@router.get("/api/organizations/{organization_id}/applications", response_model=list[ApplicationResponse])
async def list_organization_applications(organization_id: UUID, user: User = Depends(authuser)) -> list[ApplicationResponse]:
    """Return the applications for one organization."""

    await organization_access(organization_id, user)
    return await applications.list_responses(organization_id, user.id, user)


@router.post("/api/organizations/{organization_id}/invitations", status_code=204)
async def create_organization_invitation(
    organization_id: UUID,
    payload: OrganizationInvitationCreate,
    user: User = Depends(authuser),
) -> Response:
    """Create one invitation for an organization member."""

    await organization_access(organization_id, user)
    membership_role = await organizations.membership_role(organization_id, user.id)
    if membership_role not in {OrganizationRoles.admin, OrganizationRoles.maintain, OrganizationRoles.owner}:
        raise ForbiddenError("Invitation permissions required")

    try:
        await invitations.create(organization_id, payload.email, payload.role, user)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    return Response(status_code=204)


@router.post("/api/organizations", response_model=OrganizationSummary)
async def create_organization(payload: OrganizationCreate, user: User = Depends(authuser)) -> OrganizationSummary:
    """Create a new organization."""

    # Map uniqueness failures to a conflict response.
    try:
        organization = await organizations.create(payload.name, payload.location_id, user, payload.avatar)
    except ValueError as exc:
        raise ConflictError(str(exc)) from exc

    # Create the Kubernetes namespace for the organization when a compute cluster is
    # available at the same location. This is best-effort: if no compute registry exists
    # yet the namespace will be created lazily when the first application is deployed.
    registries = [r for r in await compute.list() if r.location_id == payload.location_id]
    if registries:
        registry = max(registries, key=lambda r: r.created_at)
        k8s = K8s(registry.kubeconfig, registry.proxy_secret)
        try:
            await k8s.namespace(organization.slug)
        except Exception:
            logger.exception("Failed to create namespace for organization '%s'", organization.slug)

    return organization


@router.delete("/api/organizations/{organization_id}", response_model=SuccessResponse)
async def delete_organization(organization_id: UUID, user: User = Depends(authuser)) -> SuccessResponse:
    """Delete one organization by id."""

    if user.role == PlatformRoles.administrator:
        organization = await organizations.get(organization_id)
    else:
        organization = await organization_access(organization_id, user)
        membership_role = await organizations.membership_role(organization_id, user.id)
        if membership_role != OrganizationRoles.owner:
            raise ForbiddenError("Organization owner permissions required")

    if organization is None:
        raise NotFoundError("Organization", organization_id)

    registries = [registry for registry in await compute.list() if registry.location_id == organization.location_id]
    if registries:
        registry = max(registries, key=lambda item: item.created_at)
        k8s = K8s(registry.kubeconfig, registry.proxy_secret)
        try:
            await k8s.delete(organization.slug)
        except Exception:
            logger.exception("Failed to delete namespace for organization '%s'", organization.slug)

    await organizations.delete(organization_id, user.id)
    return SuccessResponse()
