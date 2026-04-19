import src.db as db
from fastapi import APIRouter, HTTPException
from src.env import env
from src.utils import apps
from src.models.apps import AppType, AppCreate, AppMetadata, AppResponse

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
    """Create a new app by fetching its metadata and registering it."""
    existing_url = await db.apps.get_by_url(payload.url)
    if existing_url is not None:
        raise HTTPException(status_code=409, detail="App URL already exists")

    existing_key = await db.apps.get_by_key(payload.key)
    if existing_key is not None:
        raise HTTPException(status_code=409, detail="App key already exists")

    if payload.id is not None:
        existing_id = await db.apps.get_by_uuid(payload.id)
        if existing_id is not None:
            raise HTTPException(status_code=409, detail="App id already exists")

    # Fetch app metadata from the provided URL
    metadata_response = await apps.raw(
        f"{payload.url.rstrip('/')}/metadata.json", "GET"
    )
    if not metadata_response.is_success:
        raise HTTPException(
            status_code=400,
            detail=f"Unable to fetch metadata.json ({metadata_response.status_code})",
        )

    try:
        metadata = AppMetadata.model_validate(metadata_response.json())
    except ValueError as exc:
        raise HTTPException(
            status_code=400, detail="App metadata response is invalid"
        ) from exc

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

    try:
        app = await db.apps.create(
            metadata.name,
            url=payload.url,
            key=payload.key,
            app_type=metadata.type,
            app_id=payload.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return AppResponse(id=app.id, name=app.name, url=app.url, type=app.type)
