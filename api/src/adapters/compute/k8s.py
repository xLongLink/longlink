import yaml
from decimal import Decimal, InvalidOperation
from typing import Any, Callable, cast
from .base import Compute
from datetime import UTC, datetime
from src.utils import names, templates
from kubernetes import client, config
from src.logger import logger
from src.constants import TEMPLATES
from src.utils.namespace import k8name
from kubernetes.client.exceptions import ApiException

QUANTITY_SUFFIXES = {
    "Ki": Decimal(1024),
    "Mi": Decimal(1024) ** 2,
    "Gi": Decimal(1024) ** 3,
    "Ti": Decimal(1024) ** 4,
    "Pi": Decimal(1024) ** 5,
    "Ei": Decimal(1024) ** 6,
    "n": Decimal("0.000000001"),
    "u": Decimal("0.000001"),
    "m": Decimal("0.001"),
    "k": Decimal(1000),
    "K": Decimal(1000),
    "M": Decimal(1000) ** 2,
    "G": Decimal(1000) ** 3,
    "T": Decimal(1000) ** 4,
    "P": Decimal(1000) ** 5,
    "E": Decimal(1000) ** 6,
}


def parse_quantity(value: object) -> Decimal:
    """Parse one Kubernetes resource quantity into base units."""

    raw_value = str(value).strip()
    if raw_value == "":
        return Decimal(0)

    for suffix, multiplier in sorted(QUANTITY_SUFFIXES.items(), key=lambda item: len(item[0]), reverse=True):
        if raw_value.endswith(suffix):
            number = raw_value[: -len(suffix)]
            try:
                return Decimal(number) * multiplier
            except InvalidOperation:
                return Decimal(0)

    try:
        return Decimal(raw_value)
    except InvalidOperation:
        return Decimal(0)


class K8s(Compute):
    """Manage Kubernetes namespaces and internal application workloads."""

    def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
        """Initialize the Kubernetes compute adapter."""

        self._kubeconfig = kubeconfig
        self._proxy_secret = proxy_secret
        kubernetes_client = cast(Any, client)
        kubernetes_config = cast(Any, config)
        configuration = kubernetes_client.Configuration()
        loader = kubernetes_config.kube_config.KubeConfigLoader(yaml.safe_load(self._kubeconfig))
        loader.load_and_set(configuration)
        self._api_client: Any = kubernetes_client.ApiClient(configuration)
        self._core_api: Any = kubernetes_client.CoreV1Api(self._api_client)
        self._apps_api: Any = kubernetes_client.AppsV1Api(self._api_client)

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
            metadata = item.metadata
            if metadata is None or metadata.name is None or metadata.namespace is None:
                continue

            try:
                networking_api.delete_namespaced_ingress(metadata.name, metadata.namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting Ingress '{metadata.namespace}/{metadata.name}'") from exc

        # Delete managed namespaces after their contents are gone.
        for item in self._core_api.list_namespace(label_selector="managed-by=longlink").items:
            try:
                self._core_api.delete_namespace(item.metadata.name)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting namespace '{item.metadata.name}'") from exc

    def _upsert(
        self,
        create_call: Callable[..., Any],
        patch_call: Callable[..., Any],
        namespace: str,
        name: str,
        body: dict[str, Any],
    ) -> None:
        """Create a resource when missing, otherwise patch the live object."""

        try:
            patch_call(name, namespace, body)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed updating {body['kind']} '{name}'") from exc

            create_call(namespace, body)


    def _pods(self, organization: str, application: str) -> list[client.V1Pod]:
        """Return pods for one managed application."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")
        return self._core_api.list_namespaced_pod(namespace, label_selector=f"app={name}").items


    def application_pods(self, organization: str, application: str) -> list[client.V1Pod]:
        """Return pods for one managed application."""

        return self._pods(organization, application)


    def proxy(
        self,
        organization: str,
        application: str,
        path: str,
        method: str,
        query_params: list[tuple[str, str]],
        headers: dict[str, str],
        body: bytes,
    ) -> tuple[bytes, int, dict[str, str]]:
        """Proxy one request to an application service through the Kubernetes API."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")
        resource_path = f"/api/v1/namespaces/{namespace}/services/{name}/proxy/{path}"
        response_body, status_code, response_headers = self._api_client.call_api(
            resource_path,
            method,
            query_params=query_params,
            header_params=headers,
            body=body,
            auth_settings=["BearerToken"],
            _preload_content=False,
            _return_http_data_only=False,
        )

        return response_body.data, status_code, response_headers


    async def namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

        namespace = k8name(names.knames(organization, "Organization"))
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

    async def application(
        self,
        organization: str,
        application: str,
        image: str,
        port: int,
        secrets: dict[str, str],
        rollout_token: str = "",
    ) -> str:
        """Create or replace one internal application Deployment and Service."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")

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

        application_manifests = templates.readyml(
            TEMPLATES / "application.yml",
            image=image,
            name=name,
            namespace=namespace,
            port=port,
            rollout_token=rollout_token,
        )
        application_manifests = application_manifests if isinstance(application_manifests, list) else [application_manifests]

        # Apply each manifest by kind so deployments and services use the right Kubernetes client.
        for manifest in application_manifests:
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

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")

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

        namespace = k8name(names.knames(organization, "Organization"))
        try:
            self._core_api.delete_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed deleting namespace '{namespace}'") from exc


    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")
        pods = self._pods(organization, application)
        if not pods:
            raise ValueError(f"No pods found for application '{namespace}/{name}'")

        def pod_creation_time(item: client.V1Pod) -> datetime:
            """Return a pod creation timestamp with a deterministic fallback."""

            metadata = item.metadata
            if metadata is None or metadata.creation_timestamp is None:
                return datetime.min.replace(tzinfo=UTC)

            return metadata.creation_timestamp

        # Pick the newest pod so logs stay aligned with the latest rollout.
        pod = sorted(
            pods,
            key=pod_creation_time,
            reverse=True,
        )[0]
        pod_metadata = pod.metadata
        if pod_metadata is None or pod_metadata.name is None:
            raise ValueError(f"No named pods found for application '{namespace}/{name}'")

        # Convert Kubernetes API failures into a simple adapter error.
        try:
            return self._core_api.read_namespaced_pod_log(
                pod_metadata.name,
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


    async def resources(self) -> dict[str, int | float]:
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


    async def pods(self, namespace: str) -> list[dict[str, object]]:
        """List all pods in a namespace."""

        # Fetch actual usage from the metrics API when available.
        metrics_by_pod: dict[str, dict[str, int | float]] = {}
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
        except ApiException as exc:
            logger.info("Kubernetes metrics API unavailable for namespace '%s': %s", namespace, exc)

        def _pod_resources(pod: Any) -> dict[str, int | float]:
            cpu_limit = 0.0
            ram_limit = 0
            for container in pod.spec.containers or []:
                resources = container.resources
                if resources:
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
