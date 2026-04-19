import src.db as db
from fastapi import APIRouter, HTTPException
from src.env import env
from src.models.apps import AppType, AppCreate, AppMetadata, AppResponse
from src.utils.compute import ComputeConnectionError

router = APIRouter()


@router.get("/apps")
async def list_apps(type: AppType | None = None) -> list[AppResponse]:
    """List registered apps, optionally filtered by type."""
    if type is not None:
        registered_apps = await db.apps.list_by_type(type)
    else:
        registered_apps = await db.apps.list()

    return [
        AppResponse(id=app.id, name=app.name, url=app.url, type=app.type)
        for app in registered_apps
    ]


@router.post("/apps")
async def create_app(payload: AppCreate) -> AppResponse:
    """Create a new app by provisioning its container and registering it."""
    app_url = f"http://{payload.key}.localhost"

    existing_url = await db.apps.get_by_url(app_url)
    if existing_url is not None:
        raise HTTPException(status_code=409, detail="App URL already exists")

    existing_key = await db.apps.get_by_key(payload.key)
    if existing_key is not None:
        raise HTTPException(status_code=409, detail="App key already exists")

    namespace = env.ENV_PROVISION_COMPUTE_DEFAULT_NAMESPACE
    pod_name = f"{payload.key}-app".strip().lower()

    try:
        await db.computes.create_container(
            namespace=namespace,
            pod_name=pod_name,
            image=payload.image,
            command=None,
            args=None,
            env_vars={},
            container_port=None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ComputeConnectionError as exc:
        raise HTTPException(
            status_code=503,
            detail="Compute API is unavailable. Check compute service connectivity.",
        ) from exc

    try:
        # Register the app immediately and let runtime metadata be resolved later.
        metadata = AppMetadata(name=payload.key, type=AppType.tool)
        app = await db.apps.create(
            metadata.name,
            url=app_url,
            key=payload.key,
            app_type=metadata.type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return AppResponse(id=app.id, name=app.name, url=app.url, type=app.type)
