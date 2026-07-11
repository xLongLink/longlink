from typing import Any
from .gateway import KubernetesGateway
from .library import Pod, Node, APIObject, Namespace, kr8s
from src.utils import names
from src.logger import logger
from .resources import parse_kubernetes_timestamp
from kubernetes.utils.quantity import parse_quantity


class KubernetesCluster(KubernetesGateway):
    """Manage organization namespaces and cluster inspection."""

    def _application_network_policy(self, namespace: str) -> dict[str, Any]:
        """Return the ingress policy that only allows gateway traffic to app pods."""

        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "NetworkPolicy",
            "metadata": {
                "name": "longlink-gateway-ingress",
                "namespace": namespace,
            },
            "spec": {
                "podSelector": {"matchLabels": {"compute-role": "application"}},
                "policyTypes": ["Ingress"],
                "ingress": [
                    {
                        "from": [
                            {
                                "namespaceSelector": {"matchLabels": {"kubernetes.io/metadata.name": "longlink-system"}},
                                "podSelector": {"matchLabels": {"app": "longlink-gateway"}},
                            }
                        ]
                    }
                ],
            },
        }

    async def namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

        namespace = names.knames(organization)

        # Reuse an existing namespace or create it when Kubernetes reports it missing.
        try:
            await self._read(Namespace, namespace)

        # Handle namespace read failures by checking whether Kubernetes reported a miss.
        except kr8s.ServerError as exc:

            # Non-404 failures indicate Kubernetes could not confirm namespace state.
            if not self._not_found(exc):
                raise ValueError(f"Failed reading namespace '{namespace}'") from exc

            resource = await self._resource(
                {"apiVersion": "v1", "kind": "Namespace", "metadata": {"name": namespace}}
            )
            await resource.create()
            await self._upsert(self._application_network_policy(namespace))
            return None

        await self._upsert(self._application_network_policy(namespace))

    async def delete_namespace(self, organization: str) -> None:
        """Delete one managed organization namespace and tolerate missing namespaces."""

        namespace = names.knames(organization)

        # Read the namespace first so missing namespaces can be treated as already deleted.
        try:
            await self._read(Namespace, namespace)

        # Handle namespace lookup failures before attempting deletion.
        except kr8s.ServerError as exc:

            # Missing namespaces are already deleted from the cluster perspective.
            if self._not_found(exc):
                return None

            raise ValueError(f"Failed reading namespace '{namespace}'") from exc

        # Delete the namespace after Kubernetes confirms it exists.
        try:
            await self._delete(Namespace, namespace)

        # Report Kubernetes delete failures with namespace context.
        except kr8s.ServerError as exc:
            raise ValueError(f"Failed deleting namespace '{namespace}'") from exc

        await self._sync_gateway()

    async def namespaces(self) -> list[str]:
        """List all organization namespaces in the connected cluster."""

        # Dedicated compute clusters reserve Kubernetes system namespaces for platform infrastructure.
        return [ns.name for ns in await self._list(Namespace) if ns.name not in names.KUBERNETES_SYSTEM_NAMESPACES]

    async def resources(self) -> dict[str, int | float]:
        """Return total and allocatable cluster resources."""

        nodes = await self._list(Node)
        total_ram = 0
        total_cpu = 0.0
        allocatable_ram = 0
        allocatable_cpu = 0.0

        # Sum Kubernetes capacity and allocatable values across all nodes.
        for node in nodes:
            node_status = node.raw.get("status", {})
            capacity = node_status.get("capacity", {})
            allocatable = node_status.get("allocatable", {})
            total_ram += int(parse_quantity(capacity.get("memory", "0")))
            total_cpu += float(parse_quantity(capacity.get("cpu", "0")))
            allocatable_ram += int(parse_quantity(allocatable.get("memory", "0")))
            allocatable_cpu += float(parse_quantity(allocatable.get("cpu", "0")))

        return {
            "cpu_total": total_cpu,
            "cpu_allocatable": allocatable_cpu,
            "ram_total": total_ram,
            "ram_allocatable": allocatable_ram,
        }

    async def pods(self, namespace: str) -> list[dict[str, object]]:
        """List all pods in a namespace."""

        # Fetch actual usage from the metrics API when available.
        metrics_by_pod: dict[str, dict[str, int | float]] = {}

        # Query metrics only when the optional metrics API responds.
        try:
            api = await self._client()

            # Query the optional metrics API directly because kr8s does not model it as a typed resource here.
            async with api.call_api("GET", version="metrics.k8s.io/v1beta1", namespace=namespace, url="pods") as response:
                pod_metrics = response.json()

            # Fold per-container metrics into per-pod totals.
            for item in pod_metrics.get("items", []):
                cpu_usage = 0.0
                ram_usage = 0

                # Kubernetes reports usage per container, while callers need pod totals.
                for container in item.get("containers", []):
                    usage = container.get("usage", {})
                    cpu_usage += float(parse_quantity(usage.get("cpu", "0")))
                    ram_usage += int(parse_quantity(usage.get("memory", "0")))
                metrics_by_pod[item["metadata"]["name"]] = {
                    "cpu_usage": cpu_usage,
                    "ram_usage": ram_usage,
                }

        # Metrics are optional, so unavailable metrics leave usage values empty.
        except kr8s.ServerError as exc:
            logger.info("Kubernetes metrics API unavailable for namespace '%s': %s", namespace, exc)

        def pod_resources(pod: APIObject) -> dict[str, int | float]:
            """Return resource limits and observed usage for one pod."""

            cpu_limit = 0.0
            ram_limit = 0
            pod_spec = pod.raw.get("spec", {})

            # Sum configured resource limits across all containers in the pod.
            for container in pod_spec.get("containers", []):
                limits = container.get("resources", {}).get("limits", {})
                cpu_limit += float(parse_quantity(limits.get("cpu", "0")))
                ram_limit += int(parse_quantity(limits.get("memory", "0")))

            pod_name = pod.name
            usage = metrics_by_pod.get(pod_name, {})
            return {
                "cpu_limit": cpu_limit,
                "ram_limit": ram_limit,
                "cpu_usage": usage.get("cpu_usage", 0.0),
                "ram_usage": usage.get("ram_usage", 0),
            }

        pods = await self._list(Pod, namespace)

        # Return pod metadata alongside parsed creation times and resource summaries.
        return [
            {
                "name": pod.name,
                "status": pod.raw.get("status", {}).get("phase"),
                "node": pod.raw.get("spec", {}).get("nodeName"),
                "created_at": (
                    timestamp.isoformat()
                    if (timestamp := parse_kubernetes_timestamp(pod.metadata.get("creationTimestamp")))
                    else None
                ),
                "resources": pod_resources(pod),
            }
            for pod in pods
        ]
