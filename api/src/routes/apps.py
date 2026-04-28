import src.db as db
from fastapi import Response, APIRouter, HTTPException
from src.env import env
from src.utils import kubectl
from src.models.apps import AppCreate, AppResponse
from src.utils.compute import compute as compute_state

router = APIRouter()


async def _sync_compute_state_from_api() -> None:
    """Persist compute state from the registered API application rows."""
    registered_apps = await db.apps.list()
    compute_state.replace_applications(
        {app.key: app.image for app in registered_apps}
    )


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
        # Register the app immediately and let runtime metadata be resolved later.
        app = await db.apps.create(
            app_key,
            url=app_url,
            key=app_key,
            image=payload.image,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    try:
        await _sync_compute_state_from_api()
        kubectl.apply(
            compute_state.save(),
            kubeconfig=env.ENV_PROVISION_COMPUTE_KUBE_CONFIG_PATH,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply compute manifests: {exc}",
        ) from exc

    return AppResponse(id=app.id, name=app.name, url=app.url)


@router.delete("/apps/{app_id}", status_code=204)
async def delete_app(app_id: str) -> Response:
    """Delete an app by removing its compute resources and registry row."""
    app = await db.apps.get_by_uuid(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")

    try:
        deleted_app = await db.apps.delete(app.id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if deleted_app is None:
        raise HTTPException(status_code=404, detail="App not found")

    try:
        await _sync_compute_state_from_api()
        compute_state.apply()
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete compute resources: {exc}",
        ) from exc

    return Response(status_code=204)
