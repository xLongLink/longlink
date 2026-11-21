from kr8s import NotFoundError
from uuid import UUID
from typing import TYPE_CHECKING, cast
from src.utils import templates
from src.kubernetes import utils, namespace
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Namespace, NetworkPolicy, ResourceQuota
from src.models.organizations import MAX_SOLUTIONS

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


async def apply(client: "Kubernetes", organization_id: UUID, *, cpu_millicores: int, ram_bytes: int) -> None:
    """Create one Organization Namespace boundary for its explicit lifecycle."""

    # Render and apply only the requested Organization boundary.
    compute_namespace = namespace.compute(organization_id)
    if cpu_millicores <= 0 or ram_bytes <= 0:
        raise ValueError("Applications require positive CPU and RAM capacity")
    application_cpu = min(500, cpu_millicores)
    slots = min(MAX_SOLUTIONS, cpu_millicores // application_cpu, ram_bytes // (256 * 1024**2))
    if slots < 1:
        raise ValueError("Applications require at least 256Mi RAM capacity")

    # Fund bounded queue proxies and one migration/revision overlap, not billable capacity.
    namespace_manifest, quota_manifest, network_policy = templates.readyml_list(
        files("src").joinpath(".static", "kubernetes", "organization.yml"),
        namespace=compute_namespace,
        cpu_millicores=cpu_millicores + (slots + 1) * 200 + application_cpu,
        ram_bytes=ram_bytes + (slots + 1) * 128 * 1024**2 + 256 * 1024**2,
        pods=slots + 1,
    )

    # Apply the Namespace before its policy through the lifecycle owner's connection.
    api = await client.api()
    compute_boundary = Namespace(namespace_manifest, api=api)
    await utils.apply(compute_boundary)

    # Lowering admission does not evict running Pods; reject an overcommitted shrink.
    quota = ResourceQuota(quota_manifest, api=api)
    desired_capacity = dict(quota.spec["hard"])
    allocated = dict.fromkeys(desired_capacity, utils.quantity("0"))

    # Old revisions and injected sidecars must be bounded even before a quota exists.
    async for candidate in Pod.list(api=api, namespace=compute_namespace):
        pod = cast(Pod, candidate)
        if pod.raw.get("status", {}).get("phase") in {"Succeeded", "Failed"}:
            continue
        for resource in desired_capacity:
            if resource == "pods":
                allocated[resource] += 1
                continue
            section, name = resource.split(".")
            regular = utils.quantity("0")
            for container in pod.spec.get("containers", []):
                capacity = container.get("resources", {}).get(section, {}).get(name)
                if capacity is None:
                    raise ValueError("Existing application Pods and sidecars must declare CPU and RAM requests and limits")
                regular += utils.quantity(capacity)
            initial = max(
                (
                    utils.quantity(container.get("resources", {}).get(section, {}).get(name, "0"))
                    for container in pod.spec.get("initContainers", [])
                ),
                default=utils.quantity("0"),
            )
            allocated[resource] += max(regular, initial) + utils.quantity(pod.spec.get("overhead", {}).get(name, "0"))
    if any(allocated[resource] > utils.quantity(desired) for resource, desired in desired_capacity.items()):
        raise ValueError("Application capacity cannot shrink below admitted Kubernetes usage")

    # The controller's accounting also includes admission that raced the live-Pod listing.
    try:
        await quota.refresh()
    except NotFoundError:
        pass
    else:
        used = quota.raw.get("status", {}).get("used", {})
        for resource, desired in desired_capacity.items():
            if utils.quantity(used.get(resource, "0")) > utils.quantity(desired):
                raise ValueError("Application capacity cannot shrink below admitted Kubernetes usage")

    # Namespace quotas include bounded platform headroom in addition to purchased capacity.
    quota = ResourceQuota(quota_manifest, api=api)
    await utils.apply(quota)
    boundary_policy = NetworkPolicy(network_policy, api=api)
    await utils.apply(boundary_policy)
