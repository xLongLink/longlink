import src.database as db
from fastapi import Depends, HTTPException, Response, status
from src.adapters.compute.k8s import K8s
from src.adapters.database import Postgre
from src.auth import authuser, authadmin
from src.models.apps import AppCreate, AppResponse
from src.logger import logger
from src.router import router
from src.operations.applications import create_app as build_app, delete_app as teardown_app


@router.get("/api/apps", response_model=list[AppResponse])
async def list_apps(organization: str, user: db.User = Depends(authuser)) -> list[AppResponse]:
    """Return the apps registered in one organization."""

    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    apps = await db.apps.list(organization, user.id)
    app_payloads: list[dict[str, object]] = []

    for app, role_name in apps:
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
    user: db.User = Depends(authuser),
) -> AppResponse:
    """Register a new app in the database and deploy it on the compute cluster."""

    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    operation = await db.operations.create(
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

    if await db.operations.claim(operation.id) is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Operation already running")

    logger.info("Claimed app creation %s for %s/%s", operation.id, organization, payload.name)

    try:
        app = await build_app(organization, payload, user)
    except HTTPException as exc:
        logger.warning("App creation %s failed: %s", operation.id, exc.detail)
        await db.operations.fail(operation.id, str(exc.detail))
        raise
    except Exception as exc:
        logger.exception("App creation %s failed", operation.id)
        await db.operations.fail(operation.id, str(exc))
        raise
    else:
        await db.operations.ready(operation.id)
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
    _user: db.User = Depends(authadmin),
) -> None:
    """Delete an app registration and remove it from the compute cluster."""

    app = await db.apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    org = next((org for org in _user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")

    operation = await db.operations.create("app.delete", {"organization": organization, "app_id": app_id})
    logger.info("Queued app deletion %s for %s/%s", operation.id, organization, app_id)

    if await db.operations.claim(operation.id) is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Operation already running")

    logger.info("Claimed app deletion %s for %s/%s", operation.id, organization, app_id)

    try:
        await teardown_app(organization, app_id)
    except HTTPException as exc:
        logger.warning("App deletion %s failed: %s", operation.id, exc.detail)
        await db.operations.fail(operation.id, str(exc.detail))
        raise
    except Exception as exc:
        logger.exception("App deletion %s failed", operation.id)
        await db.operations.fail(operation.id, str(exc))
        raise
    else:
        await db.operations.ready(operation.id)
        await db.operations.complete(operation.id)
        logger.info("Completed app deletion %s", operation.id)

    return


@router.get("/api/apps/{app_id}/logs")
async def get_app_logs(organization: str, app_id: int, user: db.User = Depends(authuser)) -> Response:
    """Return recent pod logs for one managed app."""

    app = await db.apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found")
    if app.organization != organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"App '{app_id}' not found")

    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{organization}' not found")

    registries = [registry for registry in await db.compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No compute cluster configured")

    # Prefer the newest registry for the location so logs come from the active cluster.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No compute cluster configured for location '{org.location_id}'",
        )

    compute = K8s(registry.kubeconfig, registry.proxy_secret)

    try:
        logs = await compute.logs(organization, app.slug)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return Response(content=logs, media_type="text/plain")
