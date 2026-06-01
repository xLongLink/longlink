from __future__ import annotations
import yaml
from datetime import datetime, UTC
from src.utils import utils
from .__root__ import Compute
from kubernetes import client, config
from src.constants import TEMPLATES
from kubernetes.dynamic import DynamicClient
from kubernetes.client.rest import ApiException


class K8s(Compute):
    """Manage Kubernetes namespaces and internal application workloads."""

    def __init__(self, kubeconfig: str, ingress_name: str) -> None:
        """Initialize the Kubernetes compute adapter and bootstrap the cluster proxy."""

        self._kubeconfig = kubeconfig
        configuration = client.Configuration()
        loader = config.kube_config.KubeConfigLoader(yaml.safe_load(self._kubeconfig))
        loader.load_and_set(configuration)
        self._api_client = client.ApiClient(configuration)
        self._core_api = client.CoreV1Api(self._api_client)
        self._apps_api = client.AppsV1Api(self._api_client)
        self._dynamic_client = DynamicClient(self._api_client)

        # Bootstrap the shared cluster-wide proxy entrypoint.
        manifests = utils.yaml(TEMPLATES / "cluster-proxy.yml", ingress_name=ingress_name)
        manifests = manifests if isinstance(manifests, list) else [manifests]
        for manifest in manifests:
            resource = self._dynamic_client.resources.get(api_version=manifest["apiVersion"], kind=manifest["kind"])
            name = manifest["metadata"]["name"]
            namespace = manifest["metadata"].get("namespace")
            try:
                if resource.namespaced:
                    resource.get(name=name, namespace=namespace)
                    resource.patch(
                        body=manifest,
                        name=name,
                        namespace=namespace,
                        content_type="application/apply-patch+yaml",
                        field_manager="longlink",
                        force=True,
                    )
                else:
                    resource.get(name=name)
                    resource.patch(
                        body=manifest,
                        name=name,
                        content_type="application/apply-patch+yaml",
                        field_manager="longlink",
                        force=True,
                    )
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed applying {manifest['kind']} '{name}'") from exc
                if resource.namespaced:
                    resource.create(body=manifest, namespace=namespace)
                else:
                    resource.create(body=manifest)


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

        namespace = utils.knames(organization, "Org")
        name = utils.knames(application, "Application name")
        return self._core_api.list_namespaced_pod(namespace, label_selector=f"app={name}").items


    async def namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

        namespace = utils.knames(organization, "Org")
        try:
            self._core_api.read_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed reading namespace '{namespace}'") from exc

            self._core_api.create_namespace(
                {
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {"name": namespace, "labels": {"managed-by": "control-plane"}},
                }
            )

    async def application(self, organization: str, application: str, image: str, port: int, secrets: dict[str, str]) -> str:
        """Create or replace one internal application Deployment and Service."""

        namespace = utils.knames(organization, "Org")
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
                    "labels": {"managed-by": "control-plane", "compute-role": "application", "app": name},
                },
                "type": "Opaque",
                "stringData": secrets,
            },
        )

        # The shared proxy is part of every organization namespace.
        proxy_manifests = utils.yaml(TEMPLATES / "proxy.yml", namespace=namespace)
        proxy_manifests = proxy_manifests if isinstance(proxy_manifests, list) else [proxy_manifests]
        for manifest in proxy_manifests:
            if manifest["kind"] == "Deployment":
                self._upsert(
                    self._apps_api.create_namespaced_deployment,
                    self._apps_api.patch_namespaced_deployment,
                    namespace,
                    manifest["metadata"]["name"],
                    manifest,
                )
                continue

            if manifest["kind"] == "Service":
                self._upsert(
                    self._core_api.create_namespaced_service,
                    self._core_api.patch_namespaced_service,
                    namespace,
                    manifest["metadata"]["name"],
                    manifest,
                )

        app_manifests = utils.yaml(
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

        return f"http://{name}.{namespace}.svc.cluster.local:{port}"


    async def remove(self, organization: str, application: str) -> None:
        """Remove one managed application."""

        namespace = utils.knames(organization, "Org")
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

        namespace = utils.knames(organization, "Org")
        try:
            self._core_api.delete_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed deleting namespace '{namespace}'") from exc


    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

        namespace = utils.knames(organization, "Org")
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
