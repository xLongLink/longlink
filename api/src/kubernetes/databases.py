import json
import asyncio
from uuid import UUID
from typing import TYPE_CHECKING, cast
from src.utils import postgres, templates
from contextlib import asynccontextmanager
from src.kubernetes import tls, utils, databases, namespace
from collections.abc import AsyncGenerator
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, ResourceQuota, new_class, object_from_spec
from src.database.models.organizations import Organization

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

ClusterResource = new_class("Cluster", "postgresql.cnpg.io/v1", asyncio=True, plural="clusters")


async def apply(
    client: "Kubernetes", organization_id: UUID, password: str, storage_class: str, *, size_mib: int = 100, instances: int = 1
) -> None:
    """Create the database boundary and wait for a writable PostgreSQL cluster."""

    # Render the isolated database boundary before accessing Kubernetes.
    database_namespace = namespace.database(organization_id)
    documents = templates.readyml_list(
        files("src").joinpath(".static", "kubernetes", "database.yml"),
        namespace=database_namespace,
        compute_namespace=namespace.compute(organization_id),
        storage_class=json.dumps(storage_class),
        size_mib=size_mib,
        instances=instances,
        quota_pods=2 * instances + 1,
        quota_instances=instances + 1,
        # Reserve storage for an additional instance during replacement.
        quota_storage_mib=size_mib * (instances + 1),
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

    # Publish the cluster before waiting for database readiness.
    await utils.apply(cluster)
    await wait_ready(client, organization_id)


async def resize(client: "Kubernetes", organization_id: UUID, *, size_mib: int, instances: int) -> None:
    """Apply monotonically increasing desired database capacity without reprovisioning credentials."""

    # Desired capacity is retained on downgrades; expand namespace admission before CNPG requests larger PVCs.
    api = await client.api()
    database_namespace = namespace.database(organization_id)
    quota = ResourceQuota("longlink-database", namespace=database_namespace, api=api)
    await quota.patch({"spec": {"hard": {"requests.storage": f"{size_mib * (instances + 1)}Mi"}}})
    cluster = ClusterResource("database", namespace=database_namespace, api=api)
    await cluster.patch({"spec": {"storage": {"size": f"{size_mib}Mi"}}})


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

    # Platform workers can run outside the compute cluster and its private DNS/network.
    async with cluster.forward_database(organization.id) as port:
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


async def delete(client: "Kubernetes", organization_id: UUID) -> None:
    """Delete the database namespace, including its Cluster, credentials, and PVCs."""

    # Namespace termination is the completion boundary for destructive database cleanup.
    await utils.delete_namespace(await client.api(), namespace.database(organization_id))
