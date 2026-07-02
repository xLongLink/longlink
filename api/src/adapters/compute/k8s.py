import json
import yaml
from .base import Compute
from typing import Any, cast
from decimal import Decimal
from datetime import UTC, datetime
from src.utils import names, templates
from kubernetes import client, config
from src.logger import logger
from src.constants import TEMPLATES
from collections.abc import Callable
from src.utils.namespace import k8name
from kubernetes.client.exceptions import ApiException
from kubernetes.utils.quantity import parse_quantity as parse_kubernetes_quantity


def parse_quantity(value: object) -> Decimal:
    """Parse one Kubernetes resource quantity into base units."""

    raw_value = str(value).strip()
    if raw_value == "":
        return Decimal(0)

    try:
        return parse_kubernetes_quantity(raw_value)
    except ValueError:
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
        # Let the HTTP client calculate the length after any body normalization.
        proxy_headers = {
            key: value
            for key, value in headers.items()
            if key.lower() != "content-length"
        }
        content_type = next(
            (value for key, value in proxy_headers.items() if key.lower() == "content-type"),
            None,
        )

        # The Kubernetes client checks this header case-sensitively before choosing its encoder.
        if content_type is not None:
            proxy_headers = {
                key: value
                for key, value in proxy_headers.items()
                if key.lower() != "content-type"
            }
            proxy_headers["Content-Type"] = content_type

        proxy_body: object | None = body or None
        if proxy_body is not None and content_type is not None and "json" in content_type.lower():
            # The Kubernetes client JSON-encodes JSON requests, so pass a decoded value instead of raw bytes.
            proxy_body = json.loads(body.decode("utf-8"))

        if proxy_body is not None and content_type is None:
            # Avoid the Kubernetes client's default JSON encoder for untyped raw request bodies.
            proxy_headers["Content-Type"] = "application/octet-stream"

        response_body, status_code, response_headers = self._api_client.call_api(
            resource_path,
            method,
            query_params=query_params,
            header_params=proxy_headers,
            body=proxy_body,
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


    async def delete_application(self, organization: str, application: str) -> None:
        """Delete one managed application workload and tolerate missing resources."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")

        delete_calls = (
            (self._apps_api.delete_namespaced_deployment, "Deployment"),
            (self._core_api.delete_namespaced_service, "Service"),
            (self._core_api.delete_namespaced_secret, "Secret"),
        )
        for delete_call, kind in delete_calls:
            try:
                delete_call(name, namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting {kind} '{namespace}/{name}'") from exc


    async def delete_namespace(self, organization: str) -> None:
        """Delete one managed organization namespace and tolerate missing namespaces."""

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
