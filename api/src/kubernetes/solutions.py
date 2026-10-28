import json
import httpx
import asyncio
from kr8s import ServerError, NotFoundError, APITimeoutError, ConnectionClosedError
from uuid import UUID
from typing import TYPE_CHECKING, cast
from src.utils import templates
from kr8s.asyncio import Api
from src.kubernetes import utils, namespace
from collections.abc import AsyncIterator
from importlib.resources import files
from kr8s.asyncio.objects import Job, Pod, Secret, APIObject, Namespace, new_class

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

SOLUTION_ID_LABEL = "longlink.io/solution-id"
KnativeServiceResource = new_class("Service", "serving.knative.dev/v1", asyncio=True, plural="services")


async def _has_active_pods(api: Api, namespace: str, selector: dict[str, str]) -> bool:
    """Return whether matching Pods still need to terminate before cleanup proceeds."""

    # Missing or non-terminal phases still block schema and credential cleanup.
    async for candidate in Pod.list(api=api, namespace=namespace, label_selector=selector):
        pod = cast(Pod, candidate)
        if pod.raw.get("status", {}).get("phase") not in {"Succeeded", "Failed"}:
            return True
    return False


async def _delete_resources(resources: AsyncIterator[APIObject]) -> bool:
    """Delete listed resources that Kubernetes is not already terminating."""

    remaining = False

    # Deletion is asynchronous; any observed resource requires another poll.
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

        # A vanished migration cannot be treated as a successful completion.
        except NotFoundError as exc:
            raise RuntimeError(f"Migration Job '{job.name}' disappeared while waiting") from exc

        # Transient transport failures retry under the operation timeout.
        except (APITimeoutError, ConnectionClosedError, ServerError, httpx.HTTPError):
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

        # Completed Jobs cannot still mutate the database.
        if any(
            condition.get("type") in {"Complete", "Failed"} and condition.get("status") == "True"
            for condition in job.raw.get("status", {}).get("conditions", [])
        ):
            continue

        # Controller acknowledgement precedes checking for remaining migration Pods.
        await job.patch({"spec": {"suspend": True}})
        await _wait_for_job_condition(job, {"Suspended"})
        while True:
            if not await _has_active_pods(api, namespace, {"job-name": job.name}):
                break

            # Suspension is safe only after every migration Pod has stopped.
            await asyncio.sleep(5)


async def _run_migration(migration_job: Job) -> None:
    """Apply a migration once and reject terminal failure."""

    # Keep the rendered identity available even before Kubernetes accepts the Job.
    migration_id = migration_job.raw["metadata"]["name"]
    await utils.apply(migration_job)
    await _wait_for_job_condition(migration_job, {"Complete", "Failed"})

    # Treat the Kubernetes terminal condition as the authoritative Job outcome.
    conditions = migration_job.raw.get("status", {}).get("conditions", [])
    if any(condition.get("type") == "Failed" and condition.get("status") == "True" for condition in conditions):
        raise RuntimeError(f"Solution migration Job '{migration_id}' failed")


async def _wait_for_rollout(deployed: APIObject) -> None:
    """Wait for the current Knative revision, surfacing explicit rollout failures."""

    # Poll status without repeatedly applying the same Solution revision.
    while True:
        try:
            await deployed.refresh()

        # A deleted Knative Service cannot complete this rollout.
        except NotFoundError as exc:
            raise RuntimeError("Knative Solution Service disappeared during rollout") from exc

        # Transient transport failures retry under the operation timeout.
        except (APITimeoutError, ConnectionClosedError, ServerError, httpx.HTTPError):
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

            # Translate capacity failures before exposing generic rollout diagnostics.
            message = condition.get("message", "")
            reason = condition.get("reason", "Unknown")
            if "exceeded quota" in message.lower():
                raise RuntimeError("Kubernetes Solution capacity exhausted")

            # Other terminal controller failures retain their rollout diagnostics.
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

        # Keep polling until the desired revision is fully observed.
        await asyncio.sleep(5)


async def apply(
    client: "Kubernetes",
    organization_id: UUID,
    solution_id: UUID,
    image: str,
    secrets: dict[str, str],
    *,
    revision_id: UUID,
    migrate: bool = True,
    # Private images use the Organization's retained registry connection.
    registry_connection_id: UUID | None = None,
) -> None:
    """Deploy one Solution and wait for its rollout."""

    # Render workload resources before the first cluster mutation.
    compute_namespace = namespace.compute(organization_id)
    migration_id = f"migration-{revision_id}"
    secret_id = f"revision-{revision_id}"
    migration, service = templates.readyml_list(
        files("src").joinpath(".static", "kubernetes", "solution.yml"),
        solution_id=str(solution_id),
        image=json.dumps(image),
        namespace=compute_namespace,
        runtime_revision=revision_id.hex,
        migration_id=migration_id,
        # Each release owns its migration and runtime credential references.
        secret_id=secret_id,
        pull_secrets=json.dumps([{"name": f"registry-{registry_connection_id}"}] if registry_connection_id is not None else []),
    )

    api = await client.api()

    # Stop interrupted migrations before another release or fallback can use the schema.
    await _stop_migrations(api, compute_namespace, solution_id, resume_job=migration_id if migrate else None)

    # Keep each revision's environment isolated from the currently running Pods.
    solution_secret = Secret(
        {
            "metadata": {"name": secret_id, "namespace": compute_namespace, "labels": {SOLUTION_ID_LABEL: str(solution_id)}},
            "stringData": secrets,
        },
        api=api,
    )
    await utils.apply(solution_secret)

    # Apply migrations once without restarting a failed migration container.
    if migrate:
        migration_job = Job(migration, api=api)
        await _run_migration(migration_job)

    # Knative owns revision Deployments, Services, routing, and scale-to-zero activation.
    deployed = KnativeServiceResource(service, api=api)
    await utils.apply(deployed)
    await _wait_for_rollout(deployed)


async def delete(client: "Kubernetes", organization_id: UUID, solution_id: UUID) -> None:
    """Delete one Solution and wait until its Pods have terminated."""

    # Recheck only Kubernetes state while resources and Pods terminate.
    compute_namespace = namespace.compute(organization_id)
    api = await client.api()
    namespace_resource = Namespace(compute_namespace, api=api)
    while await namespace_resource.exists():
        remaining = False

        # Delete the Service, retained migration Jobs, and revision secrets in order.
        for resources in (
            KnativeServiceResource.list(api=api, namespace=compute_namespace, field_selector={"metadata.name": f"solution-{solution_id}"}),
            Job.list(api=api, namespace=compute_namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)}),
            Secret.list(api=api, namespace=compute_namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)}),
        ):

            # Any remaining kind requires another cleanup pass.
            if await _delete_resources(cast(AsyncIterator[APIObject], resources)):
                remaining = True

        # Provider cleanup must not race a remaining Pod that can still use runtime credentials.
        if not remaining and not await _has_active_pods(api, compute_namespace, {SOLUTION_ID_LABEL: str(solution_id)}):
            return
        await asyncio.sleep(5)


async def logs(client: "Kubernetes", organization_id: UUID, solution_id: UUID) -> list[str]:
    """Return recent logs for one managed Solution Pod."""

    # Scope the Solution Pod lookup to its Organization Namespace.
    try:
        compute_namespace = namespace.compute(organization_id)
        api = await client.api()
        migration_pod: Pod | None = None
        async for candidate in Pod.list(api=api, namespace=compute_namespace, label_selector={SOLUTION_ID_LABEL: str(solution_id)}):
            pod = cast(Pod, candidate)
            phase = pod.raw.get("status", {}).get("phase")

            # Prefer a live application Pod over migration diagnostics.
            component = pod.metadata.get("labels", {}).get("longlink.io/component")
            if component != "migration" and phase not in {"Succeeded", "Failed"}:
                return [line async for line in pod.logs(container="solution", tail_lines=200)]

            # Retain migration diagnostics only when no live application Pod was found.
            if component == "migration":
                migration_pod = pod

        # Derive fallback context only from the selected migration Pod.
        if migration_pod is not None:
            migration_phase = migration_pod.raw.get("status", {}).get("phase")
            migration_name = migration_pod.metadata["name"]

            # Preserve the failing migration's output when no application Pod exists.
            if migration_phase == "Failed":
                output = [line async for line in migration_pod.logs(tail_lines=200)]
                return [f"Migration Pod {migration_name} failed:", *output]
            return [f"Migration Pod {migration_name} is {migration_phase or 'unknown'}; Solution Pod unavailable"]
        raise RuntimeError("Solution logs unavailable")

    # Cluster lookup failures share the same public logs-unavailable contract.
    except (APITimeoutError, ConnectionClosedError, NotFoundError, ServerError) as exc:
        raise RuntimeError("Solution logs unavailable") from exc
