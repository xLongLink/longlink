import src.db as db
from fastapi import APIRouter, Depends, HTTPException, Response, status
from src.auth import authuser, authadmin
from src.adapters.database import Postgre
from src.models.apps import AppCreate, AppResponse
from src.utils.utils import knames, slugify, metadata
from src.adapters.compute.k8s import K8s

router = APIRouter(prefix="/api/apps")

APP_SERVICE_PORT = 80


@router.get("", response_model=list[AppResponse])
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


@router.post("", response_model=AppResponse)
async def create_app(
    organization: str,
    payload: AppCreate,
    user: db.User = Depends(authuser),
) -> AppResponse:
    """Register a new app in the database and deploy it on the compute cluster."""
    app_slug = slugify(payload.name)

    org = next((org for org in user.orgs if org.name == organization), None)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")
    if org.location_id is None:
        raise HTTPException(status_code=400, detail=f"Org '{organization}' has no location configured")

    registries = [registry for registry in await db.compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Create the app database schema before the workload starts.
    database_registries = [registry for registry in await db.database.list() if registry.deleted_at is None]
    if not database_registries:
        raise HTTPException(status_code=503, detail="No database configured")

    # Prefer the newest registry for the location so bootstrap uses the active gateway.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        raise HTTPException(status_code=503, detail=f"No compute cluster configured for location '{org.location_id}'")
    compute = K8s(registry.kubeconfig, registry.proxy_secret)

    database_registry = next((registry for registry in database_registries if registry.location_id == org.location_id), None)
    if database_registry is None:
        raise HTTPException(status_code=503, detail=f"No database configured for location '{org.location_id}'")
    database = Postgre(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
        database_registry.maintenance_database,
    )

    await compute.namespace(organization)
    await database.schema(organization, app_slug)

    # Deploy the app on the compute cluster.
    await compute.application(organization, app_slug, payload.image, APP_SERVICE_PORT, {})

    # Validate the image metadata after a successful deployment and print env specs.
    app_metadata = metadata(payload.image)
    if app_metadata is not None:
        for label, env in (("required", app_metadata.required), ("optional", app_metadata.optional)):
            if env is None:
                continue

            env_payload = {"name": env.name, "type": env.type}
            if env.description is not None:
                env_payload["description"] = env.description

            print(label, env_payload)

    try:
        app = await db.apps.create(
            organization,
            payload.name,
            app_slug,
            image=payload.image,
            icon=payload.icon,
            user=user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        **app.model_dump(),
        "created_by": user,
        "updated_by": user,
        "deleted_by": None,
    }


@router.delete("/{app_id}", status_code=204)
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
    if org.location_id is None:
        raise HTTPException(status_code=400, detail=f"Org '{organization}' has no location configured")

    registries = [registry for registry in await db.compute.list() if registry.deleted_at is None]
    # Prefer the newest registry for the location so teardown targets the active gateway.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is not None:
        compute = K8s(registry.kubeconfig, registry.proxy_secret)
        await compute.remove(organization, app.slug)

    try:
        await db.apps.delete(organization, app_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "App not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc

    return


@router.get("/{app_id}/logs")
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
    if org.location_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Org '{organization}' has no location configured")

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
