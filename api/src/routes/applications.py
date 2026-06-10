from fastapi import Depends, Response, HTTPException, status
from src.auth import authuser, authadmin
from src.logger import logger
from src.router import router
from src.models.applications import AppCreate, AppResponse
from src.adapters.compute.k8s import K8s
from src.database.models.users import User
from src.operations.applications import create_app as run_create_app, delete_app as run_delete_app
from src.database.services.compute import compute
from src.database.services.operations import operations
from src.database.services.applications import apps


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

    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    operation = await operations.create(
        "app.create",
        {
            "organization": organization,
            "name": payload.name,
            "image": payload.image,
            "description": payload.description,
            "icon": payload.icon,
            "envs": payload.envs,
            "user_id": user.id,
        },
    )
    logger.info("Queued app creation %s for %s/%s", operation.id, organization, payload.name)

    if await operations.claim(operation.id) is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Operation already running")

    logger.info("Claimed app creation %s for %s/%s", operation.id, organization, payload.name)

    try:
        app = await run_create_app(organization, payload, user)
    except HTTPException as exc:
        logger.warning("App creation %s failed: %s", operation.id, exc.detail)
        await operations.fail(operation.id, str(exc.detail))
        raise
    except Exception as exc:
        logger.exception("App creation %s failed", operation.id)
        await operations.fail(operation.id, str(exc))
        raise
    else:
        await operations.ready(operation.id)
        logger.info("Marked app creation %s ready", operation.id)

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

    app = await apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    org = next((org for org in _user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    operation = await operations.create("app.delete", {"organization": organization, "app_id": app_id})
    logger.info("Queued app deletion %s for %s/%s", operation.id, organization, app_id)

    if await operations.claim(operation.id) is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Operation already running")

    logger.info("Claimed app deletion %s for %s/%s", operation.id, organization, app_id)

    try:
        await run_delete_app(organization, app_id)
    except HTTPException as exc:
        logger.warning("App deletion %s failed: %s", operation.id, exc.detail)
        await operations.fail(operation.id, str(exc.detail))
        raise
    except Exception as exc:
        logger.exception("App deletion %s failed", operation.id)
        await operations.fail(operation.id, str(exc))
        raise
    else:
        await operations.ready(operation.id)
        await operations.complete(operation.id)
        logger.info("Completed app deletion %s", operation.id)

    return


@router.get("/api/apps/{app_id}/logs")
async def get_app_logs(organization: str, app_id: int, user: User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed app."""

    app = await apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found")
    if app.organization != organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found")

    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{organization}' not found")

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No compute cluster configured")

    # Prefer the newest registry for the location so logs come from the active cluster.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No compute cluster configured for location '{org.location_id}'",
        )

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    try:
        logs = await k8s.logs(organization, app.slug)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return Response(content=logs, media_type="text/plain")
