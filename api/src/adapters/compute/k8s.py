from __future__ import annotations

import yaml
from datetime import UTC, datetime
from src.utils import utils
from .base import Compute
from kubernetes import client, config
from src.constants import TEMPLATES
from src.utils.namespace import k8name
from kubernetes.client.rest import ApiException
from kubernetes.utils.quantity import parse_quantity


class K8s(Compute):
    """Manage Kubernetes namespaces and internal application workloads."""

    def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
        """Initialize the Kubernetes compute adapter."""

        self._kubeconfig = kubeconfig
        self._proxy_secret = proxy_secret
        configuration = client.Configuration()
        loader = config.kube_config.KubeConfigLoader(yaml.safe_load(self._kubeconfig))
        loader.load_and_set(configuration)
        self._api_client = client.ApiClient(configuration)
        self._core_api = client.CoreV1Api(self._api_client)
        self._apps_api = client.AppsV1Api(self._api_client)

    async def setup(self) -> None:
        """No cluster-wide bootstrap is required for service-proxy routing."""

        return None

    async def cleanup(self) -> None:
        """Delete all Kubernetes resources managed by the control plane."""

        # Remove namespaced resources before namespaces so namespace deletion is not blocked.
        for item in self._core_api.list_secret_for_all_namespaces(label_selector="managed-by=longlink").items:
            try:
                self._core_api.delete_namespaced_secret(item.metadata.name, item.metadata.namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting Secret '{item.metadata.namespace}/{item.metadata.name}'") from exc

        for item in self._core_api.list_service_for_all_namespaces(label_selector="managed-by=longlink").items:
            try:
                self._core_api.delete_namespaced_service(item.metadata.name, item.metadata.namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting Service '{item.metadata.namespace}/{item.metadata.name}'") from exc

        for item in self._apps_api.list_deployment_for_all_namespaces(label_selector="managed-by=longlink").items:
            try:
                self._apps_api.delete_namespaced_deployment(item.metadata.name, item.metadata.namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting Deployment '{item.metadata.namespace}/{item.metadata.name}'") from exc

        networking_api = client.NetworkingV1Api(self._api_client)
        for item in networking_api.list_ingress_for_all_namespaces(label_selector="managed-by=longlink").items:
            try:
                networking_api.delete_namespaced_ingress(item.metadata.name, item.metadata.namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting Ingress '{item.metadata.namespace}/{item.metadata.name}'") from exc

        # Delete managed namespaces after their contents are gone.
        for item in self._core_api.list_namespace(label_selector="managed-by=longlink").items:
            try:
                self._core_api.delete_namespace(item.metadata.name)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting namespace '{item.metadata.name}'") from exc

    def _upsert(self, create_call, patch_call, namespace: str, name: str, body: dict) -> None:
        """Create a resource when missing, otherwise patch the live object."""

        try:
            patch_call(name, namespace, body)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed updating {body['kind']} '{name}'") from exc

            create_call(namespace, body)


    def _pods(self, organization: str, application: str) -> list[client.V1Pod]:
        """Return pods for one managed application."""

        namespace = k8name(utils.knames(organization, "Org"))
        name = utils.knames(application, "Application name")
        return self._core_api.list_namespaced_pod(namespace, label_selector=f"app={name}").items


    async def namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

        namespace = k8name(utils.knames(organization, "Org"))
        # Reuse the namespace when it already exists so setup stays idempotent.
        try:
            self._core_api.read_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed reading namespace '{namespace}'") from exc

            self._core_api.create_namespace(
                {
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {"name": namespace, "labels": {"managed-by": "longlink"}},
                }
            )

    async def application(self, organization: str, application: str, image: str, port: int, secrets: dict[str, str]) -> str:
        """Create or replace one internal application Deployment and Service."""

        namespace = k8name(utils.knames(organization, "Org"))
        name = utils.knames(application, "Application name")

        # Create or replace the application Secret.
        self._upsert(
            self._core_api.create_namespaced_secret,
            self._core_api.patch_namespaced_secret,
            namespace,
            name,
            {
                "apiVersion": "v1",
                "kind": "Secret",
                "metadata": {
                    "name": name,
                    "namespace": namespace,
                    "labels": {"managed-by": "longlink", "compute-role": "application", "app": name},
                },
                "type": "Opaque",
                "stringData": secrets,
            },
        )

        app_manifests = utils.readyml(
            TEMPLATES / "application.yml",
            image=image,
            name=name,
            namespace=namespace,
            port=port,
        )
        app_manifests = app_manifests if isinstance(app_manifests, list) else [app_manifests]

        # Apply each manifest by kind so deployments and services use the right Kubernetes client.
        for manifest in app_manifests:
            if manifest["kind"] == "Deployment":
                self._upsert(
                    self._apps_api.create_namespaced_deployment,
                    self._apps_api.patch_namespaced_deployment,
                    namespace,
                    name,
                    manifest,
                )
                continue

            if manifest["kind"] == "Service":
                self._upsert(
                    self._core_api.create_namespaced_service,
                    self._core_api.patch_namespaced_service,
                    namespace,
                    name,
                    manifest,
                )

        return f"/{namespace}/{name}/"


    async def remove(self, organization: str, application: str) -> None:
        """Remove one managed application."""

        namespace = k8name(utils.knames(organization, "Org"))
        name = utils.knames(application, "Application name")

        # Delete the workload resources first so namespace cleanup is not blocked.
        for delete_call in (
            self._apps_api.delete_namespaced_deployment,
            self._core_api.delete_namespaced_service,
            self._core_api.delete_namespaced_secret,
        ):
            try:
                delete_call(name, namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting resource '{name}'") from exc


    async def delete(self, organization: str) -> None:
        """Delete the organization namespace and all managed resources."""

        namespace = k8name(utils.knames(organization, "Org"))
        try:
            self._core_api.delete_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed deleting namespace '{namespace}'") from exc


    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

        namespace = k8name(utils.knames(organization, "Org"))
        name = utils.knames(application, "Application name")
        pods = self._pods(organization, application)
        if not pods:
            raise ValueError(f"No pods found for application '{namespace}/{name}'")

        # Pick the newest pod so logs stay aligned with the latest rollout.
        pod = sorted(
            pods,
            key=lambda item: item.metadata.creation_timestamp or datetime.min.replace(tzinfo=UTC),
            reverse=True,
        )[0]
        # Convert Kubernetes API failures into a simple adapter error.
        try:
            return self._core_api.read_namespaced_pod_log(
                pod.metadata.name,
                namespace,
                tail_lines=lines,
            )
        except ApiException as exc:
            raise ValueError(f"Failed reading logs for '{namespace}/{name}'") from exc


    async def namespaces(self) -> list[str]:
        """List all namespaces managed by the control plane."""

        return [
            ns.metadata.name
            for ns in self._core_api.list_namespace(label_selector="managed-by=longlink").items
        ]


    async def resources(self) -> dict:
        """Return total and allocatable cluster resources."""

        nodes = self._core_api.list_node().items
        total_ram = 0
        total_cpu = 0.0
        allocatable_ram = 0
        allocatable_cpu = 0.0

        for node in nodes:
            capacity = node.status.capacity or {}
            allocatable = node.status.allocatable or {}
            total_ram += int(parse_quantity(capacity.get("memory", "0")))
            total_cpu += float(parse_quantity(capacity.get("cpu", "0")))
            allocatable_ram += int(parse_quantity(allocatable.get("memory", "0")))
            allocatable_cpu += float(parse_quantity(allocatable.get("cpu", "0")))

        return {
            "ram_total": total_ram,
            "ram_free": allocatable_ram,
            "cpu_total": total_cpu,
            "cpu_free": allocatable_cpu,
        }


    async def pods(self, namespace: str) -> list[dict]:
        """List all pods in a namespace."""

        # Fetch actual usage from the metrics API when available.
        metrics_by_pod: dict[str, dict] = {}
        try:
            custom_api = client.CustomObjectsApi(self._api_client)
            pod_metrics = custom_api.list_namespaced_custom_object(
                "metrics.k8s.io", "v1beta1", namespace, "pods"
            )
            for item in pod_metrics.get("items", []):
                cpu_usage = 0.0
                ram_usage = 0
                for container in item.get("containers", []):
                    usage = container.get("usage", {})
                    cpu_usage += float(parse_quantity(usage.get("cpu", "0")))
                    ram_usage += int(parse_quantity(usage.get("memory", "0")))
                metrics_by_pod[item["metadata"]["name"]] = {
                    "cpu_usage": cpu_usage,
                    "ram_usage": ram_usage,
                }
        except ApiException:
            pass

        def _pod_resources(pod):
            cpu_limit = 0.0
            ram_limit = 0
            for container in pod.spec.containers or []:
                resources = container.resources
                if resources:
                    requests = resources.requests or {}
                    limits = resources.limits or {}
                    cpu_limit += float(parse_quantity(limits.get("cpu", "0")))
                    ram_limit += int(parse_quantity(limits.get("memory", "0")))
            usage = metrics_by_pod.get(pod.metadata.name, {})
            return {
                "cpu_limit": cpu_limit,
                "ram_limit": ram_limit,
                "cpu_usage": usage.get("cpu_usage", 0.0),
                "ram_usage": usage.get("ram_usage", 0),
            }

        return [
            {
                "name": pod.metadata.name,
                "status": pod.status.phase,
                "node": pod.spec.node_name,
                "created_at": (
                    pod.metadata.creation_timestamp.isoformat()
                    if pod.metadata.creation_timestamp else None
                ),
                "resources": _pod_resources(pod),
            }
            for pod in self._core_api.list_namespaced_pod(namespace).items
        ]
