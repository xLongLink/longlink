from fastapi import HTTPException, status

from src.constants import APP_SERVICE_PORT
from src.logger import logger
from src.database.models.apps import App
from src.database.models.users import User
from src.database.services.applications import apps as apps_service
from src.database.services.compute import compute as compute_service
from src.database.services.database import database as database_service
from src.database.services.organizations import orgs as orgs_service
from src.models.applications import AppCreate
from src.utils.utils import slugify


async def create_app(organization: str, payload: AppCreate, user: User | None = None) -> App:
    """Provision one application and persist its database record."""

    app_slug = slugify(payload.name)
    logger.info("Provisioning app %s/%s", organization, app_slug)
    organization_record = await orgs_service.get(organization)
    if organization_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{organization}' not found")

    registries = [registry for registry in await compute_service.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No compute cluster configured")

    database_registries = [registry for registry in await database_service.list() if registry.deleted_at is None]
    if not database_registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No database configured")

    # Pick the newest registry for the organization location so bootstrap uses the live control plane.
    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.id,
        default=None,
    )
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No compute cluster configured for location '{organization_record.location_id}'",
        )

    database_registry = next((registry for registry in database_registries if registry.location_id == organization_record.location_id), None)
    if database_registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No database configured for location '{organization_record.location_id}'",
        )

    from src.routes import applications as route_apps

    k8s = route_apps.K8s(registry.kubeconfig, registry.proxy_secret)
    db_client = route_apps.Postgre(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
        database_registry.maintenance_database,
    )

    await k8s.namespace(organization)
    await db_client.schema(organization, app_slug)
    await k8s.application(organization, app_slug, payload.image, APP_SERVICE_PORT, payload.envs)

    try:
        app = await apps_service.create(
            organization,
            payload.name,
            app_slug,
            image=payload.image,
            description=payload.description,
            icon=payload.icon,
            user=user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    logger.info("Provisioned app %s/%s", organization, app_slug)
    return app


async def delete_app(organization: str, app_id: int) -> None:
    """Remove one application from compute and persistence layers."""

    logger.info("Removing app %s/%s", organization, app_id)
    organization_record = await orgs_service.get(organization)
    if organization_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{organization}' not found")

    app = await apps_service.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    if app.organization != organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    registries = [registry for registry in await compute_service.list() if registry.deleted_at is None]
    registry = max(
        (registry for registry in registries if registry.location_id == organization_record.location_id),
        key=lambda item: item.id,
        default=None,
    )
    if registry is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No compute cluster configured for location '{organization_record.location_id}'",
        )

    from src.routes import applications as route_apps

    k8s = route_apps.K8s(registry.kubeconfig, registry.proxy_secret)
    await k8s.remove(organization, app.slug)

    try:
        await apps_service.delete(organization, app_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "App not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc

    logger.info("Removed app %s/%s", organization, app_id)
