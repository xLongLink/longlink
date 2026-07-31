import json
import base64
import asyncio
import hashlib
from uuid import UUID
from typing import TYPE_CHECKING
from src.utils import templates
from collections.abc import Mapping
from importlib.resources import files
from kr8s.asyncio.objects import Pod, Secret, Service, Namespace, Deployment
from src.kubernetes.utils import apply_resource, deployment_is_ready

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

APPLICATION_ID_LABEL = "longlink.io/application-id"
RUNTIME_ENV_PREFIX = "LONGLINK_"


class Applications:
    """Manage explicit Application deployment, deletion, readiness, and logs."""

    def __init__(self, client: "Kubernetes") -> None:
        """Initialize Application lifecycle access through shared cluster resources."""

        self._client = client

    async def stage_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Create the user-owned values for an Application deployment."""

        # Keep Platform-owned values outside the user environment supplied at this boundary.
        if any(name.startswith(RUNTIME_ENV_PREFIX) for name in envs):
            raise ValueError("Application environment cannot include LongLink-managed variables")

        # Create the immutable Application Secret before Platform provisioning completes its values.
        api = await self._client.api()
        await Secret(
            {
                "metadata": {
                    "name": str(application_id),
                    "namespace": namespace,
                    "labels": {APPLICATION_ID_LABEL: str(application_id)},
                },
                "stringData": envs,
            },
            api=api,
        ).create()

    async def stage_runtime_envs(self, application_id: UUID, namespace: str, envs: Mapping[str, str]) -> None:
        """Add Platform-owned runtime values before creating the Application workload."""

        # Accept only the complete Platform runtime contract.
        if not envs or not all(name.startswith(RUNTIME_ENV_PREFIX) for name in envs):
            raise ValueError("Application runtime must contain only LongLink-managed variables")

        # Add generated runtime values to the user Secret before a Pod can consume it.
        api = await self._client.api()
        secret = Secret(str(application_id), namespace=namespace, api=api)
        if not await secret.exists():
            raise RuntimeError("Kubernetes Application Secret not found")
        await secret.patch({"data": {name: base64.b64encode(value.encode()).decode("ascii") for name, value in envs.items()}}, type="merge")

    async def apply(self, application_id: UUID, namespace: str, image: str) -> None:
        """Deploy one Application and wait for its rollout."""

        # Bind the Pod revision to its complete Secret before creating the workload.
        api = await self._client.api()
        secret = Secret(str(application_id), namespace=namespace, api=api)
        if not await secret.exists():
            raise RuntimeError("Kubernetes Application runtime Secret not found")
        await secret.refresh()
        # Render workload resources before the first cluster mutation.
        deployment, service = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("application", "application.yml"),
            application_id=str(application_id),
            application_id_label=APPLICATION_ID_LABEL,
            image=json.dumps(image),
            namespace=namespace,
            runtime_revision=hashlib.sha256(
                json.dumps(
                    {name: base64.b64decode(value).decode() for name, value in secret.raw["data"].items()},
                    sort_keys=True,
                    separators=(",", ":"),
                ).encode()
            ).hexdigest(),
        )

        # Create or update the Service before the Deployment starts Application Pods.
        await apply_resource(Service(service, api=api), service)
        await apply_resource(Deployment(deployment, api=api), deployment)

        # Poll rollout status without repeatedly applying the same Application revision.
        while True:
            deployed = Deployment(str(application_id), namespace=namespace, api=api)
            if not await deployed.exists():
                raise RuntimeError("Kubernetes Application Deployment disappeared during rollout")
            await deployed.refresh()
            if deployment_is_ready(deployed):
                return
            await asyncio.sleep(5)

    async def delete(self, application_id: UUID, namespace: str) -> None:
        """Delete one Application and wait until its Pods have terminated."""

        # Recheck only Kubernetes state while resources and Pods terminate.
        api = await self._client.api()
        while await Namespace(namespace, api=api).exists():
            resources = (
                Deployment(str(application_id), namespace=namespace, api=api),
                Service(f"app-{application_id}", namespace=namespace, api=api),
                Secret(str(application_id), namespace=namespace, api=api),
            )
            remaining = False
            for resource in resources:
                if await resource.exists():
                    await resource.refresh()
                    remaining = True
                    if resource.metadata.get("deletionTimestamp") is None:
                        await resource.delete()

            # Provider cleanup must not race a remaining Pod that can still use runtime credentials.
            pods = [
                pod
                async for pod in Pod.list(api=api, namespace=namespace, label_selector={APPLICATION_ID_LABEL: str(application_id)})
                if isinstance(pod, Pod)
            ]
            if not remaining and not any(pod.raw["status"].get("phase") not in {"Succeeded", "Failed"} for pod in pods):
                return
            await asyncio.sleep(5)

    async def logs(self, application_id: UUID, namespace: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed Application Pod."""

        # A missing Pod has no diagnostic log stream.
        api = await self._client.api()
        pods = [
            pod
            async for pod in Pod.list(api=api, namespace=namespace, label_selector={APPLICATION_ID_LABEL: str(application_id)})
            if isinstance(pod, Pod)
        ]
        active = [pod for pod in pods if pod.raw["status"].get("phase") not in {"Succeeded", "Failed"}]
        if not active:
            raise ValueError("No Application Pod found")
        pod = min(active, key=lambda item: item.name)
        return [line async for line in pod.logs(tail_lines=lines)]
