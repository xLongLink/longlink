from fastapi import Depends, Response, HTTPException
from src.auth import authuser, authadmin
from src.logger import logger
from src.router import router
from src.constants import APP_SERVICE_PORT
from src.utils.utils import slugify
from src.adapters.database import Postgre
from src.models.operations import OperationKind
from src.models.applications import AppCreate, AppStatus, AppResponse
from src.adapters.compute.k8s import K8s
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.operations import operations
from src.database.services.applications import apps
from src.database.services.organizations import orgs
from src.models.roles import PlatformRole


@router.get("/api/apps", response_model=list[AppResponse])
async def list_apps(organization_id: str | None = None, user: User = Depends(authuser)) -> list[AppResponse]:
    """Return organization apps, or all apps for admin views."""

    if organization_id is None:
        if user.role == PlatformRole.user:
            raise HTTPException(status_code=403, detail="Administrator privileges required")

        return [
            {
                **app.model_dump(),
                "organization": app.organization,
                "created_by": app.created_by or user,
                "updated_by": app.updated_by or app.created_by or user,
                "deleted_by": app.deleted_by,
                "role": None,
            }
            for app in await apps.list_all()
        ]

    organization_record = await orgs.get(organization_id)
    if organization_record is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization_id}' not found")

    if user.role == PlatformRole.user:
        org = next((org for org in user.orgs if org.id == organization_id), None)
        if org is None:
            raise HTTPException(status_code=404, detail=f"Org '{organization_id}' not found")

        app_rows = await apps.list(organization_id, user.id)
        app_payloads: list[dict[str, object]] = []

        for app, role_name in app_rows:
            app_payload = {
                **app.model_dump(),
                "organization": app.organization,
                "created_by": app.created_by or user,
                "updated_by": app.updated_by or app.created_by or user,
                "deleted_by": app.deleted_by,
                "role": role_name,
            }
            app_payloads.append(app_payload)

        return app_payloads

    return [
        {
            **app.model_dump(),
            "organization": app.organization,
            "created_by": app.created_by or user,
            "updated_by": app.updated_by or app.created_by or user,
            "deleted_by": app.deleted_by,
            "role": None,
        }
        for app in await apps.list_all()
        if app.organization_id == organization_id
    ]


@router.post("/api/apps", response_model=AppResponse)
async def create_app(
    organization_id: str,
    payload: AppCreate,
    user: User = Depends(authuser),
) -> AppResponse:
    """Register a new app in the database and deploy it on the compute cluster."""

    # Require membership in the target organization before creating the app.
    org = next((org for org in user.orgs if org.id == organization_id), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization_id}' not found")

    app_slug = slugify(payload.name)
    logger.info("Provisioning app %s/%s", organization_id, app_slug)

    # Resolve the organization location so provisioning uses the active registries.
    organization_record = await orgs.get(organization_id)
    if organization_record is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization_id}' not found")

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
        app = await apps.create(
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
        await k8s.namespace(organization_id)
        await db_client.schema(organization_id, app_slug)
        await k8s.application(organization_id, app_slug, payload.image, APP_SERVICE_PORT, payload.envs)
    except HTTPException:
        await apps.set_status(app.id, AppStatus.failed)
        raise
    except Exception as exc:
        await apps.set_status(app.id, AppStatus.failed)
        raise HTTPException(status_code=503, detail="Failed to initialize the application") from exc

    try:
        operation = await operations.create(OperationKind.app_create, app_id=app.id, step="verify")
    except Exception as exc:
        await apps.set_status(app.id, AppStatus.failed)
        logger.exception("Failed to queue app verification for %s/%s", organization_id, payload.name)
        raise HTTPException(status_code=503, detail="Failed to queue app verification") from exc

    logger.info("Queued app creation verification %s for %s/%s", operation.id, organization_id, payload.name)

    return app


@router.delete("/api/apps/{app_id}", status_code=204)
async def delete_app(
    organization_id: str,
    app_id: str,
    _user: User = Depends(authadmin),
) -> None:
    """Queue app deletion and return immediately."""

    # Load the app first so missing rows fail before we delete it.
    app = await apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")

    if next((org for org in _user.orgs if org.id == organization_id), None) is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization_id}' not found")

    if app.organization_id != organization_id:
        raise HTTPException(status_code=404, detail="App not found")

    await apps.set_status(app.id, AppStatus.deleting)
    try:
        await operations.create(OperationKind.app_delete, app_id=app.id, step="remove_runtime")
    except Exception as exc:
        await apps.set_status(app.id, app.status)
        logger.exception("Failed to queue app deletion for %s/%s", organization_id, app.name)
        raise HTTPException(status_code=503, detail="Failed to queue app deletion") from exc

    return


@router.get("/api/apps/{app_id}/logs")
async def get_app_logs(organization_id: str, app_id: str, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed app."""

    # Validate the app and organization before connecting to the active cluster.
    app = await apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")
    if app.organization_id != organization_id:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")

    organization_record = await orgs.get(organization_id)
    if organization_record is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization_id}' not found")

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
        logs = await k8s.logs(organization_id, app.slug)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return Response(content=logs, media_type="text/plain")
