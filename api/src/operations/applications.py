from __future__ import annotations

import asyncio
from fastapi import HTTPException, status
from src.logger import logger
from src.constants import APP_SERVICE_PORT
from src.utils.utils import slugify
from src.utils.namespace import k8name
from src.adapters.compute import K8s
from src.adapters.database import Postgre
from kubernetes.client.rest import ApiException
from src.models.applications import AppCreate, AppStatus
from src.database.models.apps import App
from src.database.models.users import User
from src.database.models.operation import Operation
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.operations import operations
from src.database.services.applications import apps
from src.database.services.organizations import orgs


async def create_app(organization: str, payload: AppCreate, user: User | None = None) -> App:
    """Provision one application, persist it, and start its resources."""

    app_slug = slugify(payload.name)
    logger.info("Provisioning app %s/%s", organization, app_slug)
    # Resolve the organization first so all later checks can use its location.
    organization_record = await orgs.get(organization)
    if organization_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{organization}' not found")

    # Require both a compute registry and a database registry before creating the app row.
    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    if not registries:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No compute cluster configured")

    database_registries = [registry for registry in await database.list() if registry.deleted_at is None]
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

    # Create the database row before provisioning any external resources.
    try:
        app = await apps.create(
            organization,
            payload.name,
            app_slug,
            image=payload.image,
            status=AppStatus.creating,
            description=payload.description,
            icon=payload.icon,
            user=user,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    db_client = Postgre(
        database_registry.host,
        database_registry.port,
        database_registry.username,
        database_registry.password,
        database_registry.sslmode,
        database_registry.maintenance_database,
    )

    # Provision the namespace, schema, and workload in order so failures can mark the app as failed.
    try:
        await k8s.namespace(organization)
        await db_client.schema(organization, app_slug)
        await k8s.application(organization, app_slug, payload.image, APP_SERVICE_PORT, payload.envs)
    except HTTPException:
        await apps.set_status(app.id, AppStatus.failed)
        raise
    except Exception as exc:
        await apps.set_status(app.id, AppStatus.failed)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Failed to initialize the application") from exc

    logger.info("Provisioned app %s/%s", organization, app_slug)
    return app


async def delete_app(organization: str, app_id: int) -> None:
    """Remove one application from compute and persistence layers."""

    logger.info("Removing app %s/%s", organization, app_id)
    # Verify the organization before touching the app or compute registry state.
    organization_record = await orgs.get(organization)
    if organization_record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Org '{organization}' not found")

    app = await apps.get_by_id(app_id)
    if app is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    if app.organization != organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="App not found")

    # Select the newest registry for the organization location so cleanup hits the active cluster.
    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
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

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    await k8s.remove(organization, app.slug)

    # Remove the database row after the external cleanup succeeds.
    try:
        await apps.delete(organization, app_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "App not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail) from exc

        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail) from exc

    logger.info("Removed app %s/%s", organization, app_id)


async def app_is_ready(operation: Operation) -> bool:
    """Check whether one app deployment is ready."""

    payload = operation.payload or {}
    app_id = payload.get("app_id")
    if not isinstance(app_id, int):
        return False

    app = await apps.get_by_id(app_id)
    if app is None:
        return False

    org = await orgs.get(app.organization)
    if org is None:
        return False

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        return False

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)

    namespace = k8name(app.organization)
    # Inspect the pods for a running workload with all containers ready.
    try:
        pods = k8s._core_api.list_namespaced_pod(namespace, label_selector=f"app={app.slug}").items
    except ApiException:
        return False

    for pod in pods:
        if pod.status is None:
            continue

        statuses = pod.status.container_statuses or []
        if pod.status.phase == "Running" and statuses and all(container.ready for container in statuses):
            return True

    return False


async def app_is_dead(operation: Operation) -> bool:
    """Check whether one app deployment has already crashed."""

    payload = operation.payload or {}
    app_id = payload.get("app_id")
    if not isinstance(app_id, int):
        return False

    app = await apps.get_by_id(app_id)
    if app is None:
        return False

    org = await orgs.get(app.organization)
    if org is None:
        return False

    registries = [registry for registry in await compute.list() if registry.deleted_at is None]
    registry = max((registry for registry in registries if registry.location_id == org.location_id), key=lambda item: item.id, default=None)
    if registry is None:
        return False

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    namespace = k8name(app.organization)
    # Inspect the pods for terminal phases or crash states.
    try:
        pods = k8s._core_api.list_namespaced_pod(namespace, label_selector=f"app={app.slug}").items
    except ApiException:
        return False

    crashed_reasons = {
        "CrashLoopBackOff",
        "CreateContainerConfigError",
        "ErrImagePull",
        "ImagePullBackOff",
        "RunContainerError",
    }

    for pod in pods:
        if pod.status is None:
            continue

        if pod.status.phase in {"Failed", "Unknown"}:
            return True

        for container in pod.status.container_statuses or []:
            state = container.state
            if state is None:
                continue

            if state.waiting is not None and state.waiting.reason in crashed_reasons:
                return True

            if state.terminated is not None and state.terminated.exit_code != 0:
                return True

    return False


async def complete_app_creation(operation: Operation) -> Operation:
    """Wait until one app starts or fails, then finalize its operation."""

    from src.operations import app_is_dead, app_is_ready
    from src.operations.applications import create_app

    payload = operation.payload or {}
    app_id = payload.get("app_id")
    # Reuse an existing app row when the operation was claimed after creation.
    if isinstance(app_id, int):
        app = await apps.get_by_id(app_id)
        if app is None:
            raise ValueError(f"App '{app_id}' not found")
    else:
        # Bootstrap the app record from the queued payload when the operation created it.
        organization = payload.get("organization")
        name = payload.get("name")
        image = payload.get("image")
        if not all(isinstance(value, str) for value in (organization, name, image)):
            raise ValueError("Operation payload missing app bootstrap data")

        app_payload = AppCreate.model_validate(payload)
        app = await create_app(organization, app_payload, None)
        app_id = app.id
        if app_id is None:
            raise ValueError("App record was not created")

    deadline = asyncio.get_running_loop().time() + 120.0
    # Poll until the app becomes ready, fails, or times out.
    while True:
        verification_operation = Operation(kind=operation.kind, payload={"app_id": app_id})

        if await app_is_ready(verification_operation):
            await apps.set_status(app.id, AppStatus.running)
            ready = await operations.ready(operation.id)
            if ready is None:
                return operation

            completed = await operations.complete(operation.id)
            if completed is not None:
                logger.info("Completed app creation %s", operation.id)
                return completed

            return ready

        if await app_is_dead(verification_operation):
            await apps.set_status(app.id, AppStatus.failed)
            failed = await operations.fail(operation.id, "App crashed during startup")
            if failed is not None:
                logger.info("Failed app creation %s", operation.id)
                return failed

            return operation

        if asyncio.get_running_loop().time() >= deadline:
            await apps.set_status(app.id, AppStatus.failed)
            failed = await operations.fail(operation.id, "App did not become ready in time")
            if failed is not None:
                logger.info("Timed out app creation %s", operation.id)
                return failed

            return operation

        await asyncio.sleep(2)
