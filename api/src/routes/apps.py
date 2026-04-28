import src.db as db
from fastapi import APIRouter, HTTPException
from src.env import env
from src.utils import kubectl
from src.models.apps import AppCreate, AppResponse
from src.utils.compute import compute as compute_state

router = APIRouter()


@router.post("/apps")
async def create_app(payload: AppCreate) -> AppResponse:
    """Create a new app by provisioning its container and registering it."""
    app_key = payload.key.strip().lower()
    app_url = f"/apps/{app_key}"

    existing_url = await db.apps.get_by_url(app_url)
    if existing_url is not None:
        raise HTTPException(status_code=409, detail="App URL already exists")

    existing_key = await db.apps.get_by_key(app_key)
    if existing_key is not None:
        raise HTTPException(status_code=409, detail="App key already exists")

    try:
        compute_state.load()
        compute_state.create(name=app_key, image=payload.image)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        kubectl.apply(
            compute_state.save(),
            kubeconfig=env.ENV_PROVISION_COMPUTE_KUBE_CONFIG_PATH,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply compute manifests: {exc}",
        ) from exc

    try:
        # Register the app immediately and let runtime metadata be resolved later.
        app = await db.apps.create(
            app_key,
            url=app_url,
            key=app_key,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return AppResponse(id=app.id, name=app.name, url=app.url)
