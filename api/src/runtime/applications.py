import base64
from typing import Any, cast
from .cluster import KubernetesCluster
from .library import Pod, Secret, Service, APIObject, Deployment, kr8s
from src.utils import names, templates
from src.constants import ROOT


class Kubernetes(KubernetesCluster):
    """Manage Kubernetes namespaces, application workloads, and the cluster gateway."""

    async def application_pods(self, organization: str, application: str) -> list[APIObject]:
        """Return pods for one managed application."""

        namespace = names.namespace(organization)
        name = names.knames(application)

        # Convert Kubernetes API failures into a simple caller error.
        try:
            return await self._list(Pod, namespace, {"app": name})
        except kr8s.ServerError as exc:
            raise RuntimeError("Failed reading application pods") from exc

    async def application_deployment_ready(self, organization: str, application: str) -> bool:
        """Return whether the current application Deployment rollout is ready."""

        namespace = names.namespace(organization)
        name = names.knames(application)

        # Read the live Deployment so rollout status reflects the Kubernetes controller state.
        try:
            deployment = await self._read(Deployment, name, namespace)
        except kr8s.ServerError as exc:
            raise RuntimeError("Failed reading application deployment") from exc

        metadata = deployment.metadata
        spec = deployment.spec
        status = deployment.status

        # Missing deployment sections mean Kubernetes has not reported readiness yet.
        if metadata is None or spec is None or status is None:
            return False

        observed_generation = status.get("observedGeneration")
        generation = metadata.get("generation")

        # Applications are single-replica workloads and should not report ready otherwise.
        if spec.get("replicas", 1) != 1:
            return False

        # A rollout without generation tracking cannot be proven ready.
        if observed_generation is None or generation is None:
            return False

        # Wait until the controller has observed the latest desired generation.
        if observed_generation < generation:
            return False

        return (
            status.get("replicas") == 1
            and status.get("updatedReplicas") == 1
            and status.get("readyReplicas") == 1
            and status.get("availableReplicas") == 1
            and status.get("unavailableReplicas", 0) == 0
        )

    async def application(
        self,
        organization: str,
        application: str,
        application_id: str,
        image: str,
        port: int,
        secrets: dict[str, str],
        rollout_token: str = "",
    ) -> str:
        """Create or replace one internal application Deployment and Service."""

        namespace = names.namespace(organization)
        name = names.knames(application)

        # Replace the full Secret data map so removed environment keys do not survive a merge patch.
        secret_body: dict[str, Any] = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": name,
                "namespace": namespace,
                "labels": {
                    "compute-role": "application",
                    "app": name,
                    "longlink.io/application-id": application_id,
                },
            },
            "type": "Opaque",
            "data": {
                key: base64.b64encode(value.encode("utf-8")).decode("ascii") for key, value in secrets.items()
            },
        }
        await self._replace(secret_body)

        application_manifests = templates.readyml_list(
            ROOT / "templates" / "application.yml",
            image=image,
            name=name,
            namespace=namespace,
            port=port,
            application_id=application_id,
            rollout_token=rollout_token,
        )

        # Apply Deployment and Service manifests after the runtime Secret exists.
        for manifest in application_manifests:
            await self._upsert(manifest)

        await self._sync_gateway()
        return f"/{namespace}/{name}/"

    async def delete_application(self, organization: str, application: str) -> None:
        """Delete one managed application workload and tolerate missing resources."""

        namespace = names.namespace(organization)
        name = names.knames(application)

        delete_calls = (
            (Deployment, "Deployment"),
            (Service, "Service"),
            (Secret, "Secret"),
        )

        # Delete all named workload resources owned by the application.
        for resource_class, kind in delete_calls:

            # Surface Kubernetes deletion failures with resource context.
            try:
                await self._delete(resource_class, name, namespace)
            except kr8s.ServerError as exc:
                raise ValueError(f"Failed deleting {kind} '{namespace}/{name}'") from exc

        await self._sync_gateway()

    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

        namespace = names.namespace(organization)
        name = names.knames(application)

        # List pods before selecting the most recent log source.
        try:
            pods = await self.application_pods(organization, application)
        except RuntimeError as exc:
            raise ValueError(f"Failed listing pods for application '{namespace}/{name}'") from exc

        # Logs require the single application pod to exist.
        if not pods:
            raise ValueError(f"No pods found for application '{namespace}/{name}'")

        pod = pods[0]

        # Convert Kubernetes API failures into a simple client-facing adapter error.
        try:
            return "\n".join([line async for line in cast(Any, pod).logs(tail_lines=lines)])
        except kr8s.ServerError as exc:
            raise ValueError(f"Failed reading logs for '{namespace}/{name}'") from exc
