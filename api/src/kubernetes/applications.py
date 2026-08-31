import json
import asyncio
import hashlib
from kr8s import ServerError, NotFoundError, APITimeoutError, ConnectionClosedError
from uuid import UUID
from typing import TYPE_CHECKING, cast
from src.utils import templates
from src.logger import logger
from importlib.resources import files
from kr8s.asyncio.objects import Job, Pod, Secret, Service, Namespace, Deployment, new_class
from src.kubernetes.utils import apply, deployment_is_ready

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

APPLICATION_ID_LABEL = "longlink.io/application-id"
HTTPRouteResource = new_class("HTTPRoute", "gateway.networking.k8s.io/v1", asyncio=True, plural="httproutes")


class Applications:
    """Manage explicit Application deployment, deletion, readiness, and logs."""

    def __init__(self, client: "Kubernetes") -> None:
        """Initialize Application lifecycle access through shared cluster resources."""

        self._client = client

    async def apply(self, application_id: UUID, namespace: str, image: str, secrets: dict[str, str]) -> None:
        """Deploy one Application and wait for its rollout."""

        # Recreate the complete Kubernetes Secret from Platform-authoritative encrypted state.
        api = await self._client.api()
        await apply(
            Secret(
                {
                    "metadata": {
                        "name": str(application_id),
                        "namespace": namespace,
                    },
                    "stringData": secrets,
                },
                api=api,
            )
        )

        # Render workload resources before the first cluster mutation.
        revision = hashlib.sha256(
            json.dumps({"image": image, "secrets": secrets}, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        migration_id = f"{application_id}-migration-{revision[:8]}"
        migration, deployment, service, route = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "application.yml"),
            application_id=str(application_id),
            application_id_label=APPLICATION_ID_LABEL,
            image=json.dumps(image),
            namespace=namespace,
            runtime_revision=revision,
            migration_id=migration_id,
        )

        # Apply migrations once without restarting a failed migration container.
        logger.info(
            "Starting migration Job %s for Application %s in namespace %s from image %s",
            migration_id,
            application_id,
            namespace,
            image,
        )
        migration_job = Job(migration, api=api)
        await apply(migration_job)
        await migration_job.wait(["condition=Complete", "condition=Failed"])
        status = migration_job.raw.get("status")
        if isinstance(status, dict) and isinstance(status.get("failed"), int) and status["failed"] > 0:
            logger.error("Migration Job %s failed for Application %s in namespace %s", migration_id, application_id, namespace)
            raise RuntimeError(f"Application migration Job '{migration_id}' failed")
        logger.info("Migration Job %s completed for Application %s in namespace %s", migration_id, application_id, namespace)

        # Create the Service and its owned HTTPRoute before starting Application Pods.
        await apply(Service(service, api=api))
        route_resource = HTTPRouteResource(route, api=api)
        await apply(route_resource)
        deployed = Deployment(deployment, api=api)
        await apply(deployed)

        # Poll rollout status without repeatedly applying the same Application revision.
        while True:
            if not await deployed.exists():
                raise RuntimeError("Kubernetes Application Deployment disappeared during rollout")
            await deployed.refresh()

            # Surface quota admission failures instead of waiting for an unavailable Pod indefinitely.
            status = deployed.raw.get("status")
            conditions = status.get("conditions") if isinstance(status, dict) else []
            if isinstance(conditions, list) and any(
                isinstance(condition, dict)
                and condition.get("type") == "ReplicaFailure"
                and condition.get("reason") == "FailedCreate"
                and isinstance(condition.get("message"), str)
                and "exceeded quota" in condition["message"]
                for condition in conditions
            ):
                raise RuntimeError("Kubernetes Application capacity exhausted")
            await route_resource.refresh()
            route_status = route_resource.raw.get("status")
            parents = route_status.get("parents", []) if isinstance(route_status, dict) else []
            route_ready = all(
                any(
                    condition.get("type") == condition_type and condition.get("status") == "True"
                    for parent in parents
                    if isinstance(parent, dict)
                    for condition in parent.get("conditions", [])
                    if isinstance(condition, dict)
                )
                for condition_type in ("Accepted", "ResolvedRefs")
            )
            if deployment_is_ready(deployed) and route_ready:
                return
            await asyncio.sleep(5)

    async def delete(self, application_id: UUID, namespace: str) -> None:
        """Delete one Application and wait until its Pods have terminated."""

        # Recheck only Kubernetes state while resources and Pods terminate.
        api = await self._client.api()
        namespace_resource = Namespace(namespace, api=api)
        resources = (
            Deployment(str(application_id), namespace=namespace, api=api),
            Service(f"app-{application_id}", namespace=namespace, api=api),
            Secret(str(application_id), namespace=namespace, api=api),
            HTTPRouteResource(str(application_id), namespace=namespace, api=api),
        )
        while await namespace_resource.exists():
            remaining = False
            for resource in resources:
                if await resource.exists():
                    await resource.refresh()
                    remaining = True
                    if resource.metadata.get("deletionTimestamp") is None:
                        await resource.delete()

            # Delete retained migration Jobs only when their Application is being removed.
            async for job in Job.list(api=api, namespace=namespace, label_selector={APPLICATION_ID_LABEL: str(application_id)}):
                remaining = True
                if job.metadata.get("deletionTimestamp") is None:
                    await job.delete()

            # Provider cleanup must not race a remaining Pod that can still use runtime credentials.
            if not remaining:
                async for pod in Pod.list(api=api, namespace=namespace, label_selector={APPLICATION_ID_LABEL: str(application_id)}):
                    if pod.raw["status"].get("phase") not in {"Succeeded", "Failed"}:
                        break
                else:
                    return
            await asyncio.sleep(5)

    async def logs(self, application_id: UUID, namespace: str) -> list[str]:
        """Return recent logs for one managed Application Pod."""

        # Scope the Application Pod lookup to its Organization Namespace.
        try:
            api = await self._client.api()
            migration_pod: Pod | None = None
            migration_phase: str | None = None
            async for candidate in Pod.list(api=api, namespace=namespace, label_selector={APPLICATION_ID_LABEL: str(application_id)}):
                status = candidate.raw.get("status")
                phase = status.get("phase") if isinstance(status, dict) else None
                component = candidate.metadata.get("labels", {}).get("longlink.io/component")
                if component != "migration" and phase not in {"Succeeded", "Failed"}:
                    return [line async for line in candidate.logs(tail_lines=200)]
                if component == "migration":
                    migration_pod = cast(Pod, candidate)
                    migration_phase = phase if isinstance(phase, str) else None
            if migration_pod is not None:
                migration_name = migration_pod.metadata.get("name", "unknown")
                if migration_phase == "Failed":
                    logs = [f"Migration Pod {migration_name} failed:"]
                    logs.extend([line async for line in migration_pod.logs(tail_lines=200)])
                    return logs
                return [f"Migration Pod {migration_name} is {migration_phase or 'unknown'}; Application Pod unavailable"]
            raise RuntimeError("Application logs unavailable")
        except (APITimeoutError, ConnectionClosedError, NotFoundError, ServerError) as exc:
            raise RuntimeError("Application logs unavailable") from exc
