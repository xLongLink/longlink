import json
import httpx
import asyncio
from kr8s import ServerError, NotFoundError, APITimeoutError, ConnectionClosedError
from uuid import UUID
from typing import TYPE_CHECKING, cast
from src.utils import templates
from src.logger import logger
from kr8s.asyncio import Api
from src.kubernetes import namespace
from collections.abc import AsyncIterator
from src.models.types import MinScale
from importlib.resources import files
from kr8s.asyncio.objects import Job, Pod, Event, Secret, APIObject, Namespace, new_class
from src.kubernetes.utils import apply

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

SOLUTION_ID_LABEL = "longlink.io/solution-id"
MIGRATION_DIAGNOSTIC_TIMEOUT_SECONDS = 10
KnativeServiceResource = new_class("Service", "serving.knative.dev/v1", asyncio=True, plural="services")


async def _has_active_pods(api: Api, namespace: str, selector: dict[str, str]) -> bool:
    """Return whether matching Pods still need to terminate before cleanup proceeds."""

    # Missing or non-terminal phases still block schema and credential cleanup.
    async for pod in Pod.list(api=api, namespace=namespace, label_selector=selector):
        if pod.raw.get("status", {}).get("phase") not in {"Succeeded", "Failed"}:
            return True
    return False


async def _delete_resources(resources: AsyncIterator[APIObject]) -> bool:
    """Delete listed resources that Kubernetes is not already terminating."""

    remaining = False
    async for resource in resources:
        remaining = True
        if resource.metadata.get("deletionTimestamp") is None:
            await resource.delete()
    return remaining


async def _wait_for_job_condition(job: Job, wanted: set[str]) -> None:
    """Poll one Job until Kubernetes reports a wanted condition as true."""

    # Poll with refresh so a dropped watch stream cannot fail the operation.
    while True:
        try:
            await job.refresh()
        except NotFoundError as exc:
            raise RuntimeError(f"Migration Job '{job.name}' disappeared while waiting") from exc
        except (APITimeoutError, ConnectionClosedError, ServerError, httpx.HTTPError):
            # Transient transport failures retry under the operation timeout.
            logger.warning("Migration Job %s status refresh failed; retrying", job.name)
            await asyncio.sleep(5)
            continue

        # Treat only explicit true conditions as terminal acknowledgement.
        conditions = job.raw.get("status", {}).get("conditions", [])
        if any(condition.get("type") in wanted and condition.get("status") == "True" for condition in conditions):
            return
        await asyncio.sleep(5)


async def _stop_migrations(api: Api, namespace: str, solution_id: UUID, resume_job: str | None) -> None:
    """Suspend conflicting migrations and wait until their Pods stop using the schema."""

    # Preserve terminal Jobs for diagnostics and the current Job for interrupted retries.
    async for candidate in Job.list(api=api, namespace=namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)}):
        job = cast(Job, candidate)
        if job.name == resume_job:
            continue
        if any(
            condition.get("type") in {"Complete", "Failed"} and condition.get("status") == "True"
            for condition in job.raw.get("status", {}).get("conditions", [])
        ):
            continue

        # Controller acknowledgement precedes checking for remaining migration Pods.
        await job.patch({"spec": {"suspend": True}})
        await _wait_for_job_condition(job, {"Suspended"})
        while await _has_active_pods(api, namespace, {"job-name": job.name}):
            await asyncio.sleep(5)


async def _log_migration_diagnostics(migration_job: Job) -> None:
    """Log the current Kubernetes state for one unsuccessful migration Job."""

    # Bound best-effort diagnostics so cluster failures cannot hide the original outcome.
    migration_id = migration_job.name
    try:
        async with asyncio.timeout(MIGRATION_DIAGNOSTIC_TIMEOUT_SECONDS):
            status = migration_job.raw.get("status", {})
            logger.error("Migration Job %s status: %s", migration_id, json.dumps(status, sort_keys=True, default=str))

            # Capture each bounded Job Pod's status and available output once.
            resource_names: set[str] = set()
            async for candidate in Pod.list(
                api=migration_job.api,
                namespace=migration_job.namespace,
                label_selector={"job-name": migration_id},
            ):
                pod = cast(Pod, candidate)
                resource_names.add(pod.name)
                pod_status = pod.raw.get("status", {})
                logger.error("Migration Pod %s status: %s", pod.name, json.dumps(pod_status, sort_keys=True, default=str))

                phase = pod_status.get("phase")
                if phase in {"Running", "Succeeded", "Failed"}:
                    output = [line async for line in pod.logs(tail_lines=200)]
                    logger.error("Recent output from migration Pod %s:\n%s", pod.name, "\n".join(output) or "(no output)")
            if not resource_names:
                logger.error("Migration Job %s has not created a Pod", migration_id)

            # One namespace Event query covers admission, quota, scheduling, volume, and image failures.
            resource_names.add(migration_id)
            async for event in Event.list(
                api=migration_job.api,
                namespace=migration_job.namespace,
                field_selector={"type": "Warning"},
            ):
                event_resource = cast(Event, event)
                involved_object = event_resource.raw.get("involvedObject", {})
                if involved_object.get("name") not in resource_names:
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


async def _run_migration(migration_job: Job) -> None:
    """Apply a migration once and report terminal failure or cancellation diagnostics."""

    # Keep the rendered identity available even before Kubernetes accepts the Job.
    metadata = migration_job.raw["metadata"]
    migration_id = metadata["name"]
    await apply(migration_job)
    try:
        await _wait_for_job_condition(migration_job, {"Complete", "Failed"})
    except asyncio.CancelledError:
        # Preserve the operation timeout or worker shutdown after bounded diagnostics.
        logger.error("Migration Job %s did not reach a terminal state before the operation stopped", migration_id)
        await _log_migration_diagnostics(migration_job)
        raise

    # Treat the Kubernetes terminal condition as the authoritative Job outcome.
    conditions = migration_job.raw.get("status", {}).get("conditions", [])
    if any(condition.get("type") == "Failed" and condition.get("status") == "True" for condition in conditions):
        logger.error(
            "Migration Job %s failed for Solution %s in namespace %s",
            migration_id,
            metadata["labels"][SOLUTION_ID_LABEL],
            metadata["namespace"],
        )
        await _log_migration_diagnostics(migration_job)
        raise RuntimeError(f"Solution migration Job '{migration_id}' failed")


async def _wait_for_rollout(deployed: APIObject) -> None:
    """Wait for the current Knative revision, surfacing explicit rollout failures."""

    # Poll status without repeatedly applying the same Solution revision.
    while True:
        try:
            await deployed.refresh()
        except NotFoundError as exc:
            raise RuntimeError("Knative Solution Service disappeared during rollout") from exc
        except (APITimeoutError, ConnectionClosedError, ServerError, httpx.HTTPError):
            # Transient transport failures retry under the operation timeout.
            logger.warning("Knative Solution Service status refresh failed; retrying")
            await asyncio.sleep(5)
            continue

        # Ignore stale failures while the controller observes a replacement or fallback revision.
        status = deployed.raw.get("status")
        generation = deployed.metadata.get("generation")
        if not isinstance(status, dict) or status.get("observedGeneration") not in {None, generation}:
            await asyncio.sleep(5)
            continue

        # Explicit False conditions fail; Unknown conditions still represent progress.
        conditions = status.get("conditions") or []
        for condition in conditions:
            if condition.get("status") != "False":
                continue
            message = condition.get("message", "")
            reason = condition.get("reason", "Unknown")
            if "exceeded quota" in message.lower():
                raise RuntimeError("Kubernetes Solution capacity exhausted")
            if condition.get("type") in {"Ready", "ConfigurationsReady", "RoutesReady"}:
                raise RuntimeError(f"Knative Solution rollout failed ({reason}): {message}")

        # An older ready route cannot satisfy readiness for the desired revision.
        desired_revision = status.get("latestCreatedRevisionName")
        if (
            status.get("observedGeneration") == generation
            and desired_revision is not None
            and status.get("latestReadyRevisionName") == desired_revision
            and any(condition.get("type") == "Ready" and condition.get("status") == "True" for condition in conditions)
        ):
            return
        await asyncio.sleep(5)


class Solutions:
    """Manage explicit Solution deployment, deletion, readiness, and logs."""

    def __init__(self, client: "Kubernetes") -> None:
        """Initialize Solution lifecycle access through shared cluster resources."""

        self._client = client

    async def apply(
        self,
        organization_id: UUID,
        solution_id: UUID,
        image: str,
        secrets: dict[str, str],
        *,
        revision_id: UUID,
        min_scale: MinScale = 0,
        migrate: bool = True,
    ) -> None:
        """Deploy one Solution and wait for its rollout."""

        # Render workload resources before the first cluster mutation.
        compute_namespace = namespace.compute(organization_id)
        migration_id = f"migration-{revision_id}"
        secret_id = f"revision-{revision_id}"
        migration, service = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("solution", "solution.yml"),
            solution_id=str(solution_id),
            image=json.dumps(image),
            namespace=compute_namespace,
            runtime_revision=revision_id.hex,
            migration_id=migration_id,
            secret_id=secret_id,
            min_scale=min_scale,
        )

        api = await self._client.api()

        # Stop interrupted migrations before another release or fallback can use the schema.
        await _stop_migrations(api, compute_namespace, solution_id, resume_job=migration_id if migrate else None)

        # Keep each revision's environment isolated from the currently running Pods.
        solution_secret = Secret(
            {
                "metadata": {
                    "name": secret_id,
                    "namespace": compute_namespace,
                    "labels": {SOLUTION_ID_LABEL: str(solution_id)},
                },
                "stringData": secrets,
            },
            api=api,
        )
        await apply(solution_secret)

        # Apply migrations once without restarting a failed migration container.
        if migrate:
            logger.info(
                "Starting migration Job %s for Solution %s in namespace %s from image %s",
                migration_id,
                solution_id,
                compute_namespace,
                image,
            )
            migration_job = Job(migration, api=api)
            await _run_migration(migration_job)
            logger.info("Migration Job %s completed for Solution %s in namespace %s", migration_id, solution_id, compute_namespace)
        else:
            logger.info("Restoring Solution %s revision %s without running migrations", solution_id, revision_id)

        # Knative owns revision Deployments, Services, routing, and scale-to-zero activation.
        deployed = KnativeServiceResource(service, api=api)
        await apply(deployed)
        await _wait_for_rollout(deployed)

    async def delete(self, organization_id: UUID, solution_id: UUID) -> None:
        """Delete one Solution and wait until its Pods have terminated."""

        # Recheck only Kubernetes state while resources and Pods terminate.
        compute_namespace = namespace.compute(organization_id)
        api = await self._client.api()
        namespace_resource = Namespace(compute_namespace, api=api)
        while await namespace_resource.exists():
            remaining = False

            if await _delete_resources(
                KnativeServiceResource.list(
                    api=api,
                    namespace=compute_namespace,
                    field_selector={"metadata.name": f"solution-{solution_id}"},
                )
            ):
                remaining = True

            # Delete retained migration Jobs only when their Solution is being removed.
            if await _delete_resources(
                Job.list(api=api, namespace=compute_namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)})
            ):
                remaining = True

            # Retain revision secrets until the Solution itself is deleted.
            if await _delete_resources(
                Secret.list(api=api, namespace=compute_namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)})
            ):
                remaining = True

            # Provider cleanup must not race a remaining Pod that can still use runtime credentials.
            if not remaining and not await _has_active_pods(api, compute_namespace, {SOLUTION_ID_LABEL: str(solution_id)}):
                return
            await asyncio.sleep(5)

    async def logs(self, organization_id: UUID, solution_id: UUID) -> list[str]:
        """Return recent logs for one managed Solution Pod."""

        # Scope the Solution Pod lookup to its Organization Namespace.
        try:
            compute_namespace = namespace.compute(organization_id)
            api = await self._client.api()
            migration_pod: Pod | None = None
            async for candidate in Pod.list(api=api, namespace=compute_namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)}):
                pod = cast(Pod, candidate)
                phase = pod.raw.get("status", {}).get("phase")
                component = pod.metadata.get("labels", {}).get("longlink.io/component")
                if component != "migration" and phase not in {"Succeeded", "Failed"}:
                    return [line async for line in pod.logs(container="solution", tail_lines=200)]
                if component == "migration":
                    migration_pod = pod

            # Derive fallback context only from the selected migration Pod.
            if migration_pod is not None:
                migration_phase = migration_pod.raw.get("status", {}).get("phase")
                migration_name = migration_pod.metadata["name"]
                if migration_phase == "Failed":
                    output = [line async for line in migration_pod.logs(tail_lines=200)]
                    return [f"Migration Pod {migration_name} failed:", *output]
                return [f"Migration Pod {migration_name} is {migration_phase or 'unknown'}; Solution Pod unavailable"]
            raise RuntimeError("Solution logs unavailable")
        except (APITimeoutError, ConnectionClosedError, NotFoundError, ServerError) as exc:
            raise RuntimeError("Solution logs unavailable") from exc
