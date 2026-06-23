from uuid import UUID
from fastapi import Depends, Response, HTTPException
from src.auth import authuser, authadmin
from src.logger import logger
from src.router import router
from src.constants import APP_SERVICE_PORT
from src.utils.utils import slugify
from src.models.roles import PlatformRoles
from src.adapters.database import Postgre
from src.models.operations import OperationKind
from src.models.applications import (AppStatus, ApplicationCreate,
                                     ApplicationResponse)
from src.adapters.compute.k8s import K8s
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.operations import operations
from src.database.services.applications import applications
from src.database.services.organizations import organizations


@router.get("/api/apps", response_model=list[ApplicationResponse])
async def list_applications(organization_id: UUID | None = None, user: User = Depends(authuser)) -> list[ApplicationResponse]:
    """Return organization applications, or all applications for admin views."""

    if organization_id is None:
        if user.role == PlatformRoles.user:
            raise HTTPException(status_code=403, detail="Administrator privileges required")

        return [
            {
                **application.model_dump(),
                "organization": application.organization,
                "created_by": application.created_by or user,
                "updated_by": application.updated_by or application.created_by or user,
                "deleted_by": application.deleted_by,
                "role": None,
            }
            for application in await applications.list_all()
        ]

    organization_record = await organizations.get(organization_id)
    if organization_record is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    if user.role == PlatformRoles.user:
        organization = next((organization for organization in user.organizations if organization.id == organization_id), None)
        if organization is None:
            raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

        application_rows = await applications.list(organization_id, user.id)
        application_payloads: list[dict[str, object]] = []

        for application, role_name in application_rows:
            application_payload = {
                **application.model_dump(),
                "organization": application.organization,
                "created_by": application.created_by or user,
                "updated_by": application.updated_by or application.created_by or user,
                "deleted_by": application.deleted_by,
                "role": role_name,
            }
            application_payloads.append(application_payload)

        return application_payloads

    return [
        {
            **application.model_dump(),
            "organization": application.organization,
            "created_by": application.created_by or user,
            "updated_by": application.updated_by or application.created_by or user,
            "deleted_by": application.deleted_by,
            "role": None,
        }
        for application in await applications.list_all()
        if application.organization_id == organization_id
    ]


@router.post("/api/apps", response_model=ApplicationResponse)
async def create_app(
    organization_id: UUID,
    payload: ApplicationCreate,
    user: User = Depends(authuser),
) -> ApplicationResponse:
    """Register a new application in the database and deploy it on the compute cluster."""

    # Require membership in the target organization before creating the app.
    organization = next((organization for organization in user.organizations if organization.id == organization_id), None)
    if organization is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    app_slug = slugify(payload.name)
    logger.info("Provisioning app %s/%s", organization.slug, app_slug)

    # Resolve the organization location so provisioning uses the active registries.
    organization_record = await organizations.get(organization_id)
    if organization_record is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    database_registries = [registry for registry in await database.list() if registry.deleted_at is None]
    if not database_registries:
        raise HTTPException(status_code=503, detail="No database configured")

    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise HTTPException(
            status_code=503,
            detail=f"No compute cluster configured for location '{organization_record.location_id}'",
        )

    database_registry = next((registry for registry in database_registries if registry.location_id == organization_record.location_id), None)
    if database_registry is None:
        raise HTTPException(
            status_code=503,
            detail=f"No database configured for location '{organization_record.location_id}'",
        )

    # Create the app row before provisioning external resources.
    try:
        application = await applications.create(
            organization_id,
            payload.name,
            app_slug,
            image=payload.image,
            status=AppStatus.creating,
            description=payload.description,
            icon=payload.icon,
            user=user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    db_client = Postgre(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
    )

    # Provision the namespace, schema, and workload in order so failures can mark the app as failed.
    try:
        await k8s.namespace(organization_record.slug)
        await db_client.schema(organization_record.slug, app_slug)
        await k8s.application(organization_record.slug, app_slug, payload.image, APP_SERVICE_PORT, payload.envs)
    except HTTPException:
        await applications.set_status(application.id, AppStatus.failed)
        raise
    except Exception as exc:
        await applications.set_status(application.id, AppStatus.failed)
        raise HTTPException(status_code=503, detail="Failed to initialize the application") from exc

    try:
        operation = await operations.create(OperationKind.app_create, application_id=application.id, step="verify", user=user)
    except Exception as exc:
        await applications.set_status(application.id, AppStatus.failed)
        logger.exception("Failed to queue application verification for %s/%s", organization.slug, payload.name)
        raise HTTPException(status_code=503, detail="Failed to queue app verification") from exc

    logger.info("Queued application creation verification %s for %s/%s", operation.id, organization.slug, payload.name)

    return application


@router.delete("/api/apps/{application_id}", status_code=204)
async def delete_app(
    organization_id: UUID,
    application_id: UUID,
    _user: User = Depends(authadmin),
) -> None:
    """Queue app deletion and return immediately."""

    # Load the app first so missing rows fail before we delete it.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    if next((organization for organization in _user.organizations if organization.id == organization_id), None) is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    if application.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="Application not found")

    await applications.set_status(application.id, AppStatus.deleting)
    try:
        await operations.create(OperationKind.app_delete, application_id=application.id, step="remove_runtime", user=_user)
    except Exception as exc:
        await applications.set_status(application.id, application.status)
        logger.exception("Failed to queue application deletion for %s/%s", organization_id, application.name)
        raise HTTPException(status_code=503, detail="Failed to queue application deletion") from exc

    return


@router.get("/api/apps/{application_id}/logs")
async def get_application_logs(organization_id: UUID, application_id: UUID, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed application."""

    # Validate the application and organization before connecting to the active cluster.
    application = await applications.get_by_id(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")
    if application.organization_id != organization_id:
        raise HTTPException(status_code=404, detail=f"Application '{application_id}' not found")

    organization_record = await organizations.get(organization_id)
    if organization_record is None:
        raise HTTPException(status_code=404, detail=f"Organization '{organization_id}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Prefer the newest registry for the location so logs come from the active cluster.
    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.created_at,
        default=None,
    )
    if registry is None:
        raise HTTPException(
            status_code=503,
            detail=f"No compute cluster configured for location '{organization_record.location_id}'",
        )

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await k8s.logs(organization_record.slug, application.slug)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return Response(content=logs, media_type="text/plain")
