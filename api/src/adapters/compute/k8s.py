from __future__ import annotations

import yaml
import asyncio
from datetime import UTC, datetime
from src.utils import utils
from .__root__ import Compute
from kubernetes import client, config
from src.constants import TEMPLATES
from src.utils.namespace import k8name
from kubernetes.client.rest import ApiException


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
        try:
            return self._core_api.read_namespaced_pod_log(
                pod.metadata.name,
                namespace,
                tail_lines=lines,
            )
        except ApiException as exc:
            raise ValueError(f"Failed reading logs for '{namespace}/{name}'") from exc
