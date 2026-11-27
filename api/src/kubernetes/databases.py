import json
import asyncio
from kr8s import NotFoundError
from uuid import UUID
from typing import TYPE_CHECKING, cast
from src.utils import postgres, templates
from contextlib import asynccontextmanager
from src.kubernetes import tls, utils, databases, namespace
from collections.abc import AsyncGenerator
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, Service, ResourceQuota, new_class, object_from_spec
from src.database.models.organizations import Organization

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

ClusterResource = new_class("Cluster", "postgresql.cnpg.io/v1", asyncio=True, plural="clusters")


def _allocation(storage_bytes: int, cpu_millicores: int, ram_bytes: int) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    """Build database quota and instance resources for bootstrap and resize."""

    # Admit replacement work while keeping the instance's memory request bounded.
    quota = {
        "requests.storage": str(storage_bytes * 2),
        "requests.cpu": f"{cpu_millicores * 3}m",
        "limits.cpu": f"{cpu_millicores * 3}m",
        "requests.memory": str(ram_bytes * 3),
        "limits.memory": str(ram_bytes * 3),
    }
    resources = {
        "requests": {"cpu": f"{min(cpu_millicores, 50)}m", "memory": str(min(ram_bytes, 256 * 1024**2))},
        "limits": {"cpu": f"{cpu_millicores}m", "memory": str(ram_bytes)},
    }
    return quota, resources


async def apply(
    client: "Kubernetes",
    organization_id: UUID,
    password: str,
    storage_class: str,
    *,
    storage_bytes: int,
    cpu_millicores: int,
    ram_bytes: int,
) -> None:
    """Create the database boundary and submit the PostgreSQL cluster."""

    # Render the isolated database boundary before accessing Kubernetes.
    if min(storage_bytes, cpu_millicores, ram_bytes) <= 0:
        raise ValueError("Database storage, CPU and RAM capacity must be positive")
    database_namespace = namespace.database(organization_id)
    existing = ClusterResource("database", namespace=database_namespace, api=await client.api())
    try:
        await existing.refresh()
    except NotFoundError:
        pass
    else:
        if utils.quantity(existing.spec["storage"]["size"]) > storage_bytes:
            raise ValueError("Database persistent storage cannot be reduced")

        # The Organization reconciler orders existing compute changes against the app remainder.
        return

    # Only a missing cluster permits bootstrap credentials and initial database manifests.
    quota, resources = _allocation(storage_bytes, cpu_millicores, ram_bytes)
    documents = templates.readyml_list(
        files("src").joinpath(".static", "kubernetes", "database.yml"),
        namespace=database_namespace,
        compute_namespace=namespace.compute(organization_id),
        storage_class=json.dumps(storage_class),
        storage_bytes=storage_bytes,
        quota=json.dumps({"pods": "3", "persistentvolumeclaims": "2", **quota}),
        resources=json.dumps(resources),
    )
    api = await client.api()

    # Establish independent database quota and ingress before CNPG creates any Pods.
    cluster_document = next(document for document in documents if document.get("kind") == "Cluster")
    for document in documents:
        if document is cluster_document:
            continue
        resource = object_from_spec(document, api=api)
        await utils.apply(resource)

    # Keep the database superuser credential in its dedicated namespace.
    secret = Secret(
        {
            "metadata": {"name": "database-superuser", "namespace": database_namespace},
            "type": "kubernetes.io/basic-auth",
            "stringData": {"username": "postgres", "password": password},
        },
        api=api,
    )
    await utils.apply(secret)
    cluster = ClusterResource(cluster_document, api=api)

    await utils.apply(cluster)


async def resize(client: "Kubernetes", organization_id: UUID, *, storage_bytes: int, cpu_millicores: int, ram_bytes: int) -> None:
    """Reconcile running database resources without shrinking persistent storage."""

    # Reject unsafe PVC shrink before mutating any quota or database configuration.
    if min(storage_bytes, cpu_millicores, ram_bytes) <= 0:
        raise ValueError("Database storage, CPU and RAM capacity must be positive")
    api = await client.api()
    database_namespace = namespace.database(organization_id)
    cluster = ClusterResource("database", namespace=database_namespace, api=api)
    await cluster.refresh()
    if utils.quantity(cluster.spec["storage"]["size"]) > storage_bytes:
        raise ValueError("Database persistent storage cannot be reduced")

    # Admit replacement Pods and PVC expansion before updating the live CNPG cluster.
    capacity, resources = _allocation(storage_bytes, cpu_millicores, ram_bytes)
    quota = ResourceQuota("longlink-database", namespace=database_namespace, api=api)
    await quota.patch({"spec": {"hard": capacity}})
    await cluster.patch({"spec": {"storage": {"size": str(storage_bytes)}, "resources": resources}})


async def provisioned_storage_bytes(client: "Kubernetes", organization_id: UUID) -> int:
    """Read the current persistent allocation before accepting a capacity update."""

    # Preserve historic binary allocations exactly when validating decimal-byte requests.
    api = await client.api()
    cluster = ClusterResource("database", namespace=namespace.database(organization_id), api=api)
    await cluster.refresh()
    return int(utils.quantity(cluster.spec["storage"]["size"]))


async def wait_ready(client: "Kubernetes", organization_id: UUID) -> None:
    """Wait for cluster readiness and the expected ready, nonterminating database Pods."""

    # Observe readiness without changing externally managed hibernation.
    api = await client.api()
    database_namespace = namespace.database(organization_id)
    cluster = ClusterResource("database", namespace=database_namespace, api=api)
    async with asyncio.timeout(2 * 60):
        # Hibernation annotations alone do not prove that PostgreSQL is accepting traffic.
        while True:
            await cluster.refresh()
            status = cluster.raw.get("status", {})
            conditions = status.get("conditions", [])

            # False hibernation conditions still mean shutdown; after removal, verify live Pod state too.
            if (
                cluster.metadata.get("deletionTimestamp") is None
                and status.get("readyInstances") == cluster.spec["instances"]
                and any(condition.get("type") == "Ready" and condition.get("status") == "True" for condition in conditions)
                and not any(condition.get("type") == "cnpg.io/hibernation" for condition in conditions)
            ):
                # Controller conditions must be confirmed by ready instance Pods.
                ready_pods = 0
                async for candidate in Pod.list(
                    api=api, namespace=database_namespace, label_selector={"cnpg.io/cluster": "database", "cnpg.io/podRole": "instance"}
                ):
                    pod = cast(Pod, candidate)

                    # Require a live, non-terminating instance Pod.
                    pod_status = pod.raw.get("status", {})
                    if (
                        pod.metadata.get("deletionTimestamp") is not None
                        or pod_status.get("phase") != "Running"
                        # Pod readiness must be explicitly acknowledged.
                        or not any(
                            condition.get("type") == "Ready" and condition.get("status") == "True"
                            for condition in pod_status.get("conditions", [])
                        )
                    ):
                        break

                    # An old ready Pod cannot acknowledge a just-updated database allocation.
                    desired_resources = cluster.spec.get("resources", {})
                    if desired_resources:
                        postgres_container = next(
                            (container for container in pod.spec.get("containers", []) if container.get("name") == "postgres"), None
                        )
                        if postgres_container is None:
                            break
                        actual_resources = postgres_container.get("resources", {})
                        if any(
                            utils.quantity(actual_resources.get(section, {}).get(resource, "0")) != utils.quantity(capacity)
                            for section, allocations in desired_resources.items()
                            for resource, capacity in allocations.items()
                        ):
                            break
                    ready_pods += 1
                else:
                    # Every configured PostgreSQL instance must be ready.
                    if ready_pods == cluster.spec["instances"]:
                        return
            await asyncio.sleep(1)


@asynccontextmanager
async def connection(
    organization: Organization, cluster: "Kubernetes", *, certificate: str | None = None
) -> AsyncGenerator[postgres.Postgres]:
    """Own a private PostgreSQL tunnel using the caller's CA snapshot or a fresh cluster lookup."""

    # Refresh the selector before kr8s resolves a ready Pod for the private database tunnel.
    service = Service("database-rw", namespace=namespace.database(organization.id), api=await cluster.api())
    await service.refresh()
    async with service.portforward(5432, local_port="auto") as port:
        # Preserve the cluster DNS hostname for certificate verification even through a local tunnel.
        if certificate is None:
            certificate = await databases.certificate(cluster, organization.id)
        database = postgres.Postgres(
            host=namespace.database_hostname(organization.id),
            port=port,
            username="postgres",
            password=organization.database_password,
            certificate=certificate,
            # Connect through the tunnel while validating the cluster hostname.
            hostaddr="127.0.0.1",
        )
        yield database


async def certificate(client: "Kubernetes", organization_id: UUID) -> str:
    """Read the CNPG-generated server CA as PEM text, not a filesystem path."""

    # CNPG's default server CA Secret is named after its Cluster.
    return await tls.certificate(client, namespace.database(organization_id), "database-ca", entry="ca.crt")
