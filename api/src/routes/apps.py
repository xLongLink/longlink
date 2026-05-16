import time
import src.db as db
from fastapi import Response, APIRouter, HTTPException
from src.env import env
from src.models.apps import AppCreate, AppResponse
from src.utils.utils import app_url as compute_app_url
from src.adapters.compute import root as compute

router = APIRouter(prefix="/api")


def _get_pod_logs(app_key: str) -> str:
    """Fetch the last logs from pods belonging to the app deployment."""
    from kubernetes import client, config

    config.load_kube_config(config_file=str(env.COMPUTE_KUBE_CONFIG_PATH))
    core_api = client.CoreV1Api()

    try:
        pods = core_api.list_namespaced_pod(
            compute.namespace,
            label_selector=f"app={app_key}",
        )
        for pod in pods.items:
            try:
                return core_api.read_namespaced_pod_log(
                    pod.metadata.name,
                    compute.namespace,
                    tail_lines=50,
                )
            except client.ApiException:
                continue
    except client.ApiException:
        pass
    return "(no logs available)"


def _check_pod_failure(app_key: str) -> str | None:
    """Check if any pod for the app is in a failed state and return the reason."""
    from kubernetes import client, config

    config.load_kube_config(config_file=str(env.COMPUTE_KUBE_CONFIG_PATH))
    core_api = client.CoreV1Api()

    try:
        pods = core_api.list_namespaced_pod(
            compute.namespace,
            label_selector=f"app={app_key}",
        )
        for pod in pods.items:
            status = pod.status
            if status.phase in ("Failed", "Unknown"):
                return f"Pod phase: {status.phase} - {status.message or ''}"

            if status.container_statuses:
                for cs in status.container_statuses:
                    if cs.state.waiting:
                        reason = cs.state.waiting.reason
                        message = cs.state.waiting.message or ""
                        if reason in ("CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull", "CreateContainerConfigError"):
                            return f"Container '{cs.name}': {reason} - {message}"
                    if cs.state.terminated and cs.state.terminated.exit_code != 0:
                        return f"Container '{cs.name}' terminated with exit code {cs.state.terminated.exit_code}: {cs.state.terminated.reason or ''} - {cs.state.terminated.message or ''}"
    except client.ApiException:
        pass
    return None


def _wait_for_deployment_ready(app_key: str, timeout: int = 30, interval: int = 2) -> None:
    """Wait until the app deployment reports ready, or raise with container logs on failure."""
    from kubernetes import client, config

    config.load_kube_config(config_file=str(env.COMPUTE_KUBE_CONFIG_PATH))
    apps_api = client.AppsV1Api()
    deadline = time.time() + timeout
    last_conditions = ""

    while time.time() < deadline:
        try:
            deployment = apps_api.read_namespaced_deployment(app_key, compute.namespace)
            ready_replicas = deployment.status.ready_replicas or 0
            if ready_replicas >= 1:
                return

            status = deployment.status
            conditions = []
            if status.conditions:
                for cond in status.conditions:
                    conditions.append(f"{cond.type}: {cond.status} - {cond.message or ''}")
            last_conditions = "; ".join(conditions)
        except client.ApiException:
            pass

        failure_reason = _check_pod_failure(app_key)
        if failure_reason:
            logs = _get_pod_logs(app_key)
            raise RuntimeError(
                f"Deployment '{app_key}' failed. "
                f"Reason: {failure_reason}. "
                f"Container logs:\n{logs}"
            )

        time.sleep(interval)

    logs = _get_pod_logs(app_key)
    raise TimeoutError(
        f"Deployment '{app_key}' did not become ready within {timeout}s. "
        f"Conditions: [{last_conditions}]. "
        f"Container logs:\n{logs}"
    )


async def _sync_compute_state_from_api() -> None:
    """Persist compute state from the registered API application rows."""
    registered_apps = await db.apps.list()
    compute.replace_applications(
        {app.name: app.image for app in registered_apps}
    )


async def _rollback_app_registration(app_name: str) -> None:
    """Remove a newly created app row after provisioning fails."""
    await db.apps.delete(app_name)


@router.post("/apps")
async def create_app(payload: AppCreate) -> AppResponse:
    """Create a new app by provisioning its container and registering it."""
    app_name = payload.name.strip().lower()
    app_url = compute_app_url(app_name)

    existing_app = await db.apps.get(app_name)
    if existing_app is not None:
        raise HTTPException(status_code=409, detail="App name already exists")

    try:
        # Register the app immediately and let runtime metadata be resolved later.
        app = await db.apps.create(
            app_name,
            url=app_url,
            image=payload.image,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    try:
        await _sync_compute_state_from_api()
        compute.apply()
        _wait_for_deployment_ready(app_name)
    except ValueError as exc:
        await _rollback_app_registration(app_name)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply compute manifests: {exc}",
        ) from exc
    except RuntimeError as exc:
        await _rollback_app_registration(app_name)
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
    except TimeoutError as exc:
        await _rollback_app_registration(app_name)
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        await _rollback_app_registration(app_name)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to provision app: {exc}",
        ) from exc

    return AppResponse(name=app.name, url=compute_app_url(app.name))


@router.delete("/apps/{app_name}", status_code=204)
async def delete_app(app_name: str) -> Response:
    """Delete an app by removing its compute resources and registry row."""
    app_name = app_name.strip().lower()
    app = await db.apps.get(app_name)
    if app is None:
        raise HTTPException(status_code=404, detail="App not found")

    try:
        deleted_app = await db.apps.delete(app.name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if deleted_app is None:
        raise HTTPException(status_code=404, detail="App not found")

    try:
        await _sync_compute_state_from_api()
        compute.apply()
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete compute resources: {exc}",
        ) from exc

    return Response(status_code=204)
