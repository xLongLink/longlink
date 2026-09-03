import json
import asyncio
import hashlib
from kr8s import ServerError, NotFoundError, APITimeoutError, ConnectionClosedError
from uuid import UUID
from typing import TYPE_CHECKING, cast
from src.utils import templates
from src.logger import logger
from importlib.resources import files
from kr8s.asyncio.objects import Job, Pod, Event, Secret, Service, Namespace, Deployment, new_class
from src.kubernetes.utils import apply, deployment_is_ready

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

SOLUTION_ID_LABEL = "longlink.io/solution-id"
MIGRATION_DIAGNOSTIC_TIMEOUT_SECONDS = 10
HTTPRouteResource = new_class("HTTPRoute", "gateway.networking.k8s.io/v1", asyncio=True, plural="httproutes")


async def _log_migration_diagnostics(migration_job: Job) -> None:
    """Log the current Kubernetes state for one unsuccessful migration Job."""

    # Bound best-effort diagnostics so cluster failures cannot hide the original outcome.
    migration_id = migration_job.name
    try:
        async with asyncio.timeout(MIGRATION_DIAGNOSTIC_TIMEOUT_SECONDS):
            status = migration_job.raw.get("status", {})
            logger.error("Migration Job %s status: %s", migration_id, json.dumps(status, sort_keys=True, default=str))

            # Capture each bounded Job Pod's status and available output once.
            resource_names = {migration_id}
            pod_found = False
            async for candidate in Pod.list(
                api=migration_job.api,
                namespace=migration_job.namespace,
                label_selector={"job-name": migration_id},
            ):
                pod_found = True
                pod = cast(Pod, candidate)
                resource_names.add(pod.name)
                pod_status = pod.raw.get("status", {})
                logger.error("Migration Pod %s status: %s", pod.name, json.dumps(pod_status, sort_keys=True, default=str))

                phase = pod_status.get("phase") if isinstance(pod_status, dict) else None
                if phase in {"Running", "Succeeded", "Failed"}:
                    output = [line async for line in pod.logs(tail_lines=200)]
                    logger.error("Recent output from migration Pod %s:\n%s", pod.name, "\n".join(output) or "(no output)")
            if not pod_found:
                logger.error("Migration Job %s has not created a Pod", migration_id)

            # One namespace Event query covers admission, quota, scheduling, volume, and image failures.
            async for event in Event.list(
                api=migration_job.api,
                namespace=migration_job.namespace,
                field_selector={"type": "Warning"},
            ):
                event_resource = cast(Event, event)
                involved_object = event_resource.raw.get("involvedObject")
                if not isinstance(involved_object, dict) or involved_object.get("name") not in resource_names:
                    continue
                logger.error(
                    "Kubernetes warning for %s: %s: %s",
                    involved_object["name"],
                    event_resource.raw.get("reason", "Unknown"),
                    event_resource.raw.get("message", "No message"),
                )
    except TimeoutError:
        logger.error("Migration Job %s diagnostics timed out", migration_id)
    except Exception:
        logger.exception("Could not collect migration Job %s diagnostics", migration_id)


class Solutions:
    """Manage explicit Solution deployment, deletion, readiness, and logs."""

    def __init__(self, client: "Kubernetes") -> None:
        """Initialize Solution lifecycle access through shared cluster resources."""

        self._client = client

    async def apply(self, solution_id: UUID, namespace: str, image: str, secrets: dict[str, str]) -> None:
        """Deploy one Solution and wait for its rollout."""

        # Render workload resources before the first cluster mutation.
        revision = hashlib.sha256(
            json.dumps({"image": image, "secrets": secrets}, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        migration_id = f"{solution_id}-migration-{revision[:8]}"
        migration, deployment, service, route = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("solution", "solution.yml"),
            solution_id=str(solution_id),
            solution_id_label=SOLUTION_ID_LABEL,
            image=json.dumps(image),
            namespace=namespace,
            runtime_revision=revision,
            migration_id=migration_id,
        )

        # Recreate the complete Kubernetes Secret from Platform-authoritative encrypted state.
        api = await self._client.api()
        solution_secret = Secret(
            {
                "metadata": {
                    "name": str(solution_id),
                    "namespace": namespace,
                },
                "stringData": secrets,
            },
            api=api,
        )
        await apply(solution_secret)

        # Apply migrations once without restarting a failed migration container.
        logger.info(
            "Starting migration Job %s for Solution %s in namespace %s from image %s",
            migration_id,
            solution_id,
            namespace,
            image,
        )
        migration_job = Job(migration, api=api)
        await apply(migration_job)
        try:
            await migration_job.wait(["condition=Complete", "condition=Failed"])
        except asyncio.CancelledError:
            # Preserve the operation timeout or worker shutdown after collecting bounded cluster diagnostics.
            logger.error("Migration Job %s did not reach a terminal state before the operation stopped", migration_id)
            await _log_migration_diagnostics(migration_job)
            raise

        # Treat the Kubernetes terminal condition as the authoritative Job outcome.
        if any(
            condition.get("type") == "Failed" and condition.get("status") == "True"
            for condition in migration_job.raw["status"]["conditions"]
        ):
            logger.error("Migration Job %s failed for Solution %s in namespace %s", migration_id, solution_id, namespace)
            await _log_migration_diagnostics(migration_job)
            raise RuntimeError(f"Solution migration Job '{migration_id}' failed")
        logger.info("Migration Job %s completed for Solution %s in namespace %s", migration_id, solution_id, namespace)

        # Create the Service and its owned HTTPRoute before starting Solution Pods.
        service_resource = Service(service, api=api)
        await apply(service_resource)
        route_resource = HTTPRouteResource(route, api=api)
        await apply(route_resource)
        deployed = Deployment(deployment, api=api)
        await apply(deployed)

        # Poll rollout status without repeatedly applying the same Solution revision.
        while True:
            try:
                await deployed.refresh()
            except NotFoundError as exc:
                raise RuntimeError("Kubernetes Solution Deployment disappeared during rollout") from exc

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
                raise RuntimeError("Kubernetes Solution capacity exhausted")
            if not deployment_is_ready(deployed):
                await asyncio.sleep(5)
                continue

            # Wait for the ready Deployment's route references to be accepted.
            await route_resource.refresh()
            route_status = route_resource.raw.get("status")
            parents = route_status.get("parents", []) if isinstance(route_status, dict) else []
            route_conditions = {
                condition.get("type")
                for parent in parents
                if isinstance(parent, dict)
                for condition in parent.get("conditions", [])
                if isinstance(condition, dict) and condition.get("status") == "True"
            }
            if {"Accepted", "ResolvedRefs"} <= route_conditions:
                return
            await asyncio.sleep(5)

    async def delete(self, solution_id: UUID, namespace: str) -> None:
        """Delete one Solution and wait until its Pods have terminated."""

        # Recheck only Kubernetes state while resources and Pods terminate.
        api = await self._client.api()
        namespace_resource = Namespace(namespace, api=api)
        resources = (
            Deployment(str(solution_id), namespace=namespace, api=api),
            Service(f"solution-{solution_id}", namespace=namespace, api=api),
            Secret(str(solution_id), namespace=namespace, api=api),
            HTTPRouteResource(str(solution_id), namespace=namespace, api=api),
        )
        while await namespace_resource.exists():
            remaining = False
            for resource in resources:
                if await resource.exists():
                    await resource.refresh()
                    remaining = True
                    if resource.metadata.get("deletionTimestamp") is None:
                        await resource.delete()

            # Delete retained migration Jobs only when their Solution is being removed.
            async for candidate in Job.list(api=api, namespace=namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)}):
                job = cast(Job, candidate)
                remaining = True
                if job.metadata.get("deletionTimestamp") is None:
                    await job.delete()

            # Provider cleanup must not race a remaining Pod that can still use runtime credentials.
            if not remaining:
                async for candidate in Pod.list(api=api, namespace=namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)}):
                    pod = cast(Pod, candidate)
                    if pod.raw["status"].get("phase") not in {"Succeeded", "Failed"}:
                        break
                else:
                    return
            await asyncio.sleep(5)

    async def logs(self, solution_id: UUID, namespace: str) -> list[str]:
        """Return recent logs for one managed Solution Pod."""

        # Scope the Solution Pod lookup to its Organization Namespace.
        try:
            api = await self._client.api()
            migration_pod: Pod | None = None
            migration_phase: str | None = None
            async for candidate in Pod.list(api=api, namespace=namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)}):
                pod = cast(Pod, candidate)
                status = pod.raw.get("status")
                phase = status.get("phase") if isinstance(status, dict) else None
                component = pod.metadata.get("labels", {}).get("longlink.io/component")
                if component != "migration" and phase not in {"Succeeded", "Failed"}:
                    return [line async for line in pod.logs(tail_lines=200)]
                if component == "migration":
                    migration_pod = pod
                    migration_phase = phase if isinstance(phase, str) else None
            if migration_pod is not None:
                migration_name = migration_pod.metadata.get("name", "unknown")
                if migration_phase == "Failed":
                    logs = [f"Migration Pod {migration_name} failed:"]
                    logs.extend([line async for line in migration_pod.logs(tail_lines=200)])
                    return logs
                return [f"Migration Pod {migration_name} is {migration_phase or 'unknown'}; Solution Pod unavailable"]
            raise RuntimeError("Solution logs unavailable")
        except (APITimeoutError, ConnectionClosedError, NotFoundError, ServerError) as exc:
            raise RuntimeError("Solution logs unavailable") from exc
