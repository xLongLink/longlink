import json
import src.db as db
import docker
from fastapi import Depends, APIRouter, HTTPException, status
from src.auth import authuser, authadmin
from src.adapters.database import Postgre
from src.models.apps import AppCreate, AppResponse
from src.utils.utils import knames, slugify
from src.adapters.compute.k8s import K8s

router = APIRouter(prefix="/api/apps")

APP_SERVICE_PORT = 80


def inspect_image_specs(image: str) -> dict[str, object] | None:
    """Inspect a built image and return LongLink labels if available."""

    try:
        client = docker.from_env()
        inspect_data = client.images.get(image).attrs
    except docker.errors.DockerException:
        return None

    labels = inspect_data.get("Config", {}).get("Labels") or {}
    if not isinstance(labels, dict):
        return None

    env_spec = labels.get("longlink.env.spec")
    inspected: dict[str, object] = {
        "name": labels.get("longlink.name"),
        "version": labels.get("longlink.version"),
        "description": labels.get("longlink.description"),
    }

    if env_spec is not None:
        try:
            inspected["env_spec"] = json.loads(env_spec)
        except json.JSONDecodeError:
            return None

    return {key: value for key, value in inspected.items() if value is not None}


@router.get("", response_model=list[AppResponse])
async def list_apps(organization: str, user: db.User = Depends(authuser)) -> list[AppResponse]:
    """Return the apps registered in one organization."""

    org_names = {org.name for org in user.orgs}
    if organization not in org_names:
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

    org = await db.orgs.get(organization)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")
    if org.location_id is None:
        raise HTTPException(status_code=400, detail=f"Org '{organization}' has no location configured")

    registries = await db.compute.list()
    if not registries:
        raise HTTPException(status_code=503, detail="No compute cluster configured")

    # Create the app database schema before the workload starts.
    database_registries = await db.database.list()
    if not database_registries:
        raise HTTPException(status_code=503, detail="No database configured")

    # Prefer the newest registry for the location so bootstrap uses the active gateway.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        raise HTTPException(status_code=503, detail=f"No compute cluster configured for location '{org.location_id}'")
    compute = K8s(registry.kubeconfig, registry.ingress_name, registry.proxy_secret)

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

    # Print the built image labels so operators can verify the app contract.
    image_specs = inspect_image_specs(payload.image)
    if image_specs is not None:
        print(json.dumps(image_specs, indent=2))

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

    org = await db.orgs.get(organization)
    if org is None:
        raise HTTPException(status_code=404, detail=f"Org '{organization}' not found")
    if org.location_id is None:
        raise HTTPException(status_code=400, detail=f"Org '{organization}' has no location configured")

    registries = await db.compute.list()
    # Prefer the newest registry for the location so teardown targets the active gateway.
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is not None:
        compute = K8s(registry.kubeconfig, registry.ingress_name, registry.proxy_secret)
        await compute.remove(organization, app.slug)

    try:
        await db.apps.delete(organization, app_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "App not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc

    return
