import json
import base64
from uuid import UUID
from sqlmodel import col
from sqlalchemy import select
from src.kubernetes import namespace
from kr8s.asyncio.objects import Secret
from src.database.session import session_scope
from src.kubernetes.utils import apply
from src.database.services import registries
from src.kubernetes.client import Kubernetes
from src.database.models.registries import RegistryConnection

REGISTRY_LABEL = "longlink.io/registry-connection-id"


async def synchronize(cluster: Kubernetes, organization_id: UUID) -> None:
    """Own the transaction that serializes registry credentials and shared pull secrets."""

    # Never let an older deployment overwrite a newly rotated registry credential.
    async with session_scope() as session:
        await registries.lock(session, organization_id)
        result = await session.scalars(select(RegistryConnection).where(col(RegistryConnection.organization_id) == organization_id))
        connections = result.all()
        api = await cluster.api()
        compute_namespace = namespace.compute(organization_id)

        # Shared connection names let retained Knative revisions use rotated credentials.
        active = set()
        for connection in connections:
            secret_name = f"registry-{connection.id}"
            active.add(secret_name)
            authentication = base64.b64encode(f"{connection.username}:{connection.credential}".encode()).decode()
            secret = Secret(
                {
                    "metadata": {
                        "name": secret_name,
                        "namespace": compute_namespace,
                        "labels": {REGISTRY_LABEL: str(connection.id)},
                    },
                    "type": "kubernetes.io/dockerconfigjson",
                    "stringData": {".dockerconfigjson": json.dumps({"auths": {connection.host: {"auth": authentication}}})},
                },
                api=api,
            )
            await apply(secret)

        # Delete only secrets for explicitly removed, unused connections.
        async for secret in Secret.list(api=api, namespace=compute_namespace, label_selector=REGISTRY_LABEL):
            if secret.name not in active:
                await secret.delete()
        await session.commit()
