"""Reconcile, connect to, and delete isolated Organization CNPG clusters.

An Organization database lives in ``longlink-database-{organization UUID hex}``
with its Cluster, credentials, quota, and network policy. ``apply`` renders that
boundary before creating CNPG resources. ``resume`` confirms both CNPG
status and ready instance Pods before callers connect.

    Structure::

    Organization
    └── Namespace longlink-database-{organization UUID hex}
        ├── Cluster database
        ├── Secret database-superuser
        ├── ResourceQuota database
        └── NetworkPolicy database
"""

import ssl
import json
import base64
import asyncio
from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import templates
from src.kubernetes import utils, namespace
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, new_class, object_from_spec

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

ClusterResource = new_class("Cluster", "postgresql.cnpg.io/v1", asyncio=True, plural="clusters")


async def apply(
    client: "Kubernetes",
    organization_id: UUID,
    password: str,
    storage_class: str,
    *,
    size_mib: int = 100,
    instances: int = 1,
) -> None:
    """Create the database boundary and wait for a writable PostgreSQL cluster."""

    # Render the database boundary before the first cluster mutation.
    database_namespace = namespace.database(organization_id)
    documents = templates.readyml_list(
        files("src.kubernetes.templates").joinpath("solution", "database.yml"),
        namespace=database_namespace,
        compute_namespace=namespace.compute(organization_id),
        storage_class=json.dumps(storage_class),
        size_mib=size_mib,
        instances=instances,
        quota_pods=2 * instances + 1,
        quota_instances=instances + 1,
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
    secret = Secret(
        {
            "metadata": {"name": "database-superuser", "namespace": database_namespace},
            "type": "kubernetes.io/basic-auth",
            "stringData": {"username": "postgres", "password": password},
        },
        api=api,
    )
    await utils.apply(secret)
    cluster = ClusterResource(
        cluster_document,
        api=api,
    )
    await utils.apply(cluster)
    await resume(client, organization_id)


async def resume(client: "Kubernetes", organization_id: UUID) -> None:
    """Wait for acknowledged wake and the expected ready, nonterminating database Pods."""

    # Clearing hibernation is idempotent; confirmed readiness is required before using SQL.
    api = await client.api()
    database_namespace = namespace.database(organization_id)
    cluster = ClusterResource(
        "database",
        namespace=database_namespace,
        api=api,
    )
    await cluster.patch({"metadata": {"annotations": {"cnpg.io/hibernation": "off"}}})
    async with asyncio.timeout(2 * 60):
        while True:
            await cluster.refresh()
            status = cluster.raw.get("status", {})
            conditions = status.get("conditions", [])
            if (
                cluster.metadata.get("annotations", {}).get("cnpg.io/hibernation") == "off"
                and cluster.metadata.get("deletionTimestamp") is None
                and status.get("readyInstances") == cluster.spec["instances"]
                and any(condition.get("type") == "Ready" and condition.get("status") == "True" for condition in conditions)
                and not any(condition.get("type") == "cnpg.io/hibernation" for condition in conditions)
            ):
                # False hibernation conditions still mean shutdown; after removal, verify live Pod state too.
                ready_pods = 0
                async for pod in Pod.list(
                    api=api,
                    namespace=database_namespace,
                    label_selector={"cnpg.io/cluster": "database", "cnpg.io/podRole": "instance"},
                ):
                    pod_status = pod.raw.get("status", {})
                    if (
                        pod.metadata.get("deletionTimestamp") is not None
                        or pod_status.get("phase") != "Running"
                        or not any(
                            condition.get("type") == "Ready" and condition.get("status") == "True"
                            for condition in pod_status.get("conditions", [])
                        )
                    ):
                        break
                    ready_pods += 1
                else:
                    if ready_pods == cluster.spec["instances"]:
                        return
            await asyncio.sleep(1)


async def certificate(client: "Kubernetes", organization_id: UUID) -> str:
    """Read the CNPG-generated server CA as PEM text, not a filesystem path."""

    # CNPG's default server CA Secret is named after its Cluster.
    secret = Secret(
        "database-ca",
        namespace=namespace.database(organization_id),
        api=await client.api(),
    )
    await secret.refresh()
    certificate = base64.b64decode(secret.raw["data"]["ca.crt"], validate=True).decode("ascii")
    ssl.create_default_context(cadata=certificate)
    return certificate


async def delete(client: "Kubernetes", organization_id: UUID) -> None:
    """Delete the database namespace, including its Cluster, credentials, and PVCs."""

    # Namespace termination is the completion boundary for destructive database cleanup.
    await utils.delete_namespace(await client.api(), namespace.database(organization_id))
