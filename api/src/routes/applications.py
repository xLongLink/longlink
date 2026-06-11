from fastapi import Depends, Response, HTTPException
from src.auth import authuser, authadmin
from src.constants import APP_SERVICE_PORT
from src.logger import logger
from src.router import router
from src.models.applications import AppCreate, AppStatus, AppResponse
from src.adapters.compute.k8s import K8s
from src.adapters.database import Postgre
from src.database.models.users import User
from src.database.services.compute import compute
from src.database.services.operations import operations
from src.database.services.applications import apps
from src.database.services.database import database
from src.database.services.organizations import orgs
from src.utils.utils import slugify


@router.get("/api/apps", response_model=list[AppResponse])
async def list_apps(organization: str, user: User = Depends(authuser)) -> list[AppResponse]:
    """Return the apps registered in one organization."""

    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    app_rows = await apps.list(organization, user.id)
    app_payloads: list[dict[str, object]] = []

    for app, role_name in app_rows:
        app_payload = {
            **app.model_dump(),
            "created_by": app.created_by or user,
            "updated_by": app.updated_by or app.created_by or user,
            "deleted_by": app.deleted_by,
            "role": role_name,
        }
        app_payloads.append(app_payload)

    return app_payloads


@router.post("/api/apps", response_model=AppResponse)
async def create_app(
    organization: str,
    payload: AppCreate,
    user: User = Depends(authuser),
) -> AppResponse:
    """Register a new app in the database and deploy it on the compute cluster."""

    # Require membership in the target organization before creating the app.
    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    app_slug = slugify(payload.name)
    logger.info("Provisioning app %s/%s", organization, app_slug)

    # Resolve the organization location so provisioning uses the active registries.
    organization_record = await orgs.get(organization)
    if organization_record is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    database_registries = [registry for registry in await database.list() if registry.deleted_at is None]
    if not database_registries:
        raise HTTPException(status_code=503, detail="No database configured")

    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.id,
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
            organization,
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
        await k8s.namespace(organization)
        await db_client.schema(organization, app_slug)
        await k8s.application(organization, app_slug, payload.image, APP_SERVICE_PORT, payload.envs)
    except HTTPException:
        await apps.set_status(app.id, AppStatus.failed)
        raise
    except Exception as exc:
        await apps.set_status(app.id, AppStatus.failed)
        raise HTTPException(status_code=503, detail="Failed to initialize the application") from exc

    try:
        operation = await operations.create("app.create", app_id=app.id)
    except Exception as exc:
        await apps.set_status(app.id, AppStatus.failed)
        logger.exception("Failed to queue app verification for %s/%s", organization, payload.name)
        raise HTTPException(status_code=503, detail="Failed to queue app verification") from exc

    logger.info("Queued app creation verification %s for %s/%s", operation.id, organization, payload.name)

    return {
        **app.model_dump(),
        "created_by": user,
        "updated_by": user,
        "deleted_by": None,
    }


@router.delete("/api/apps/{app_id}", status_code=204)
async def delete_app(
    organization: str,
    app_id: int,
    _user: User = Depends(authadmin),
) -> None:
    """Delete an app registration and remove it from the compute cluster."""

    # Load the app first so missing rows fail before we delete it.
    app = await apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")

    if next((org for org in _user.orgs if org.name == organization), None) is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    # Resolve the organization location so cleanup targets the live cluster.
    organization_record = await orgs.get(organization)
    if organization_record is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.id,
        default=None,
    )
    if registry is None:
        raise HTTPException(
            status_code=503,
            detail=f"No compute cluster configured for location '{organization_record.location_id}'",
        )

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Remove compute resources before deleting the database row.
    await k8s.remove(organization, app.slug)

    try:
        await apps.delete(organization, app_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "App not found":
            raise HTTPException(status_code=404, detail=detail) from exc

        raise HTTPException(status_code=409, detail=detail) from exc

    return


@router.get("/api/apps/{app_id}/logs")
async def get_app_logs(organization: str, app_id: int, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed app."""

    # Validate the app and organization before connecting to the active cluster.
    app = await apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")
    if app.organization != organization:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")

    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Prefer the newest registry for the location so logs come from the active cluster.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        raise HTTPException(
            status_code=503,
            detail=f"No compute cluster configured for location '{org.location_id}'",
        )

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    # Map adapter errors to a service-unavailable response for the API client.
    try:
        logs = await k8s.logs(organization, app.slug)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return Response(content=logs, media_type="text/plain")
