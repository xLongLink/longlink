import time
import src.db as db
from fastapi import Response, APIRouter, HTTPException
from src.env import env
from src.utils import kubectl
from src.models.apps import AppCreate, AppResponse
from src.utils.utils import app_url as compute_app_url
from src.utils.compute import compute as compute_state

router = APIRouter()


def _get_pod_logs(app_key: str) -> str:
    """Fetch the last logs from pods belonging to the app deployment."""
    from kubernetes import client, config

    config.load_kube_config(config_file=str(compute_state.kubeconfig_path))
    core_api = client.CoreV1Api()

    try:
        pods = core_api.list_namespaced_pod(
            compute_state.namespace,
            label_selector=f"app={app_key}",
        )
        for pod in pods.items:
            try:
                return core_api.read_namespaced_pod_log(
                    pod.metadata.name,
                    compute_state.namespace,
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

    config.load_kube_config(config_file=str(compute_state.kubeconfig_path))
    core_api = client.CoreV1Api()

    try:
        pods = core_api.list_namespaced_pod(
            compute_state.namespace,
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

    config.load_kube_config(config_file=str(compute_state.kubeconfig_path))
    apps_api = client.AppsV1Api()
    deadline = time.time() + timeout
    last_conditions = ""

    while time.time() < deadline:
        try:
            deployment = apps_api.read_namespaced_deployment(app_key, compute_state.namespace)
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
    compute_state.replace_applications(
        {app.key: app.image for app in registered_apps}
    )


@router.post("/apps")
async def create_app(payload: AppCreate) -> AppResponse:
    """Create a new app by provisioning its container and registering it."""
    app_key = payload.key.strip().lower()
    app_url = compute_app_url(app_key)

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
        _wait_for_deployment_ready(app_key)
    except ValueError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply compute manifests: {exc}",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc
    except TimeoutError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        ) from exc

    return AppResponse(id=app.id, name=app.name, url=compute_app_url(app.key))


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
