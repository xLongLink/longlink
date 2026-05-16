from __future__ import annotations

from urllib.parse import urlparse

from kubernetes import client, config
from kubernetes.client.rest import ApiException

import src.db as db
from src.constants import TEMPLATES
from src.env import env
from src.utils.utils import knames
from src.utils.utils import yaml as template_yaml

from .__root__ import Root


class Compute(Root):
    """Manage Kubernetes namespaces and application workloads."""

    def __init__(
        self,
        kube_config_path: str,
        ingress_host: str = "localhost",
        ingress_name: str = "control-ingress",
    ) -> None:
        """Initialize the Kubernetes compute adapter."""
        self._kube_config_path = kube_config_path
        self.ingress_host = ingress_host
        self.ingress_name = ingress_name

    def _api_client(self) -> client.ApiClient:
        """Return a Kubernetes API client for the configured kubeconfig."""
        config.load_kube_config(config_file=self._kube_config_path)
        return client.ApiClient()

    def _namespace_api(self) -> client.CoreV1Api:
        """Return a CoreV1 API client."""
        return client.CoreV1Api(self._api_client())

    def _apps_api(self) -> client.AppsV1Api:
        """Return an AppsV1 API client."""
        return client.AppsV1Api(self._api_client())

    def _networking_api(self) -> client.NetworkingV1Api:
        """Return a NetworkingV1 API client."""
        return client.NetworkingV1Api(self._api_client())

    def _namespace_name(self, organization: str) -> str:
        """Normalize the organization name to a Kubernetes namespace name."""
        knames(organization, "Organization")
        return organization

    def _application_name(self, application: str) -> str:
        """Normalize one application name for Kubernetes resources."""
        knames(application, "Application name")
        return application

    async def _application_image(self, organization: str, application: str) -> str:
        """Resolve the application image from the API registry."""
        app = await db.apps.get(organization, application)
        if app is None:
            raise ValueError(f"App '{organization}/{application}' not found")

        return app.image

    def _namespace_manifest(self, organization: str) -> dict:
        """Build the namespace manifest for one organization."""
        return {
            "apiVersion": "v1",
            "kind": "Namespace",
            "metadata": {
                "name": organization,
                "labels": {"managed-by": "control-plane"},
            },
        }

    def _router_manifests(self, organization: str) -> list[dict]:
        """Build the shared router manifests for one organization."""
        manifests = template_yaml(TEMPLATES / "router.yml", namespace=organization)
        return manifests if isinstance(manifests, list) else [manifests]

    def _application_manifests(self, organization: str, name: str, image: str) -> list[dict]:
        """Build the deployment and service manifests for one application."""
        manifests = template_yaml(
            TEMPLATES / "application.yml",
            image=image,
            name=name,
            namespace=organization,
        )
        return manifests if isinstance(manifests, list) else [manifests]

    def _ingress_manifest(self, organization: str, application_names: list[str]) -> dict:
        """Build the ingress manifest for one organization."""
        manifest = template_yaml(
            TEMPLATES / "ingress.yml",
            ingress_host=self.ingress_host,
            ingress_name=self.ingress_name,
            namespace=organization,
        )
        paths = [
            {
                "path": f"/{name}(/|$)(.*)",
                "pathType": "ImplementationSpecific",
                "backend": {"service": {"name": name, "port": {"number": 80}}},
            }
            for name in sorted(application_names)
        ]

        # The base ingress must stay valid even when the namespace has no apps yet.
        if paths:
            manifest["spec"]["rules"][0]["http"]["paths"] = paths
        else:
            manifest["spec"].pop("rules", None)

        return manifest

    def _create_or_patch(self, api_call_create, api_call_patch, namespace: str, name: str, body: dict) -> None:
        """Create a resource when missing, otherwise patch the live object."""
        try:
            api_call_patch(name, namespace, body)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed updating {body['kind']} '{name}'") from exc

            api_call_create(namespace, body)

    def _delete_if_exists(self, api_call_delete, namespace: str, name: str) -> None:
        """Delete one namespaced resource and ignore not-found errors."""
        try:
            api_call_delete(name, namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed deleting resource '{name}'") from exc


    async def _current_applications(self, organization: str) -> list[str]:
        """Read the live application deployments from one namespace."""
        namespace = self._namespace_name(organization)
        apps_api = self._apps_api()
        try:
            deployments = apps_api.list_namespaced_deployment(namespace).items
        except ApiException as exc:
            raise ValueError(f"Failed listing applications in namespace '{namespace}'") from exc

        applications: list[str] = []
        for deployment in deployments:
            labels = deployment.metadata.labels or {}
            if labels.get("managed-by") != "control-plane":
                continue
            if labels.get("compute-role") != "application":
                continue
            applications.append(deployment.metadata.name)

        return sorted(applications)

    async def _ensure_namespace(self, organization: str) -> None:
        """Create the organization namespace and base router if missing."""
        namespace = self._namespace_name(organization)
        core_api = self._namespace_api()

        try:
            core_api.read_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed reading namespace '{namespace}'") from exc

            core_api.create_namespace(self._namespace_manifest(namespace))

        # The namespace always needs the shared router and ingress to route apps.
        for manifest in self._router_manifests(namespace):
            if manifest["kind"] == "Deployment":
                self._create_or_patch(
                    self._apps_api().create_namespaced_deployment,
                    self._apps_api().patch_namespaced_deployment,
                    namespace,
                    manifest["metadata"]["name"],
                    manifest,
                )
                continue

            if manifest["kind"] == "Service":
                self._create_or_patch(
                    self._namespace_api().create_namespaced_service,
                    self._namespace_api().patch_namespaced_service,
                    namespace,
                    manifest["metadata"]["name"],
                    manifest,
                )

    async def _sync_ingress(self, organization: str) -> None:
        """Rebuild the ingress paths from the live application deployments."""
        namespace = self._namespace_name(organization)
        application_names = await self._current_applications(namespace)
        manifest = self._ingress_manifest(namespace, application_names)
        networking_api = self._networking_api()

        self._create_or_patch(
            networking_api.create_namespaced_ingress,
            networking_api.patch_namespaced_ingress,
            namespace,
            manifest["metadata"]["name"],
            manifest,
        )

    async def list(self, organization: str) -> list[str]:
        """List applications deployed in one organization namespace."""
        namespace = self._namespace_name(organization)
        await self._ensure_namespace(namespace)
        await self._sync_ingress(namespace)
        return await self._current_applications(namespace)

    async def create(self, organization: str, application: str) -> None:
        """Create one application deployment in an organization namespace."""
        namespace = self._namespace_name(organization)
        name = self._application_name(application)
        image = await self._application_image(namespace, name)

        await self._ensure_namespace(namespace)
        app_manifests = self._application_manifests(namespace, name, image)

        apps_api = self._apps_api()
        core_api = self._namespace_api()
        for manifest in app_manifests:
            if manifest["kind"] == "Deployment":
                self._create_or_patch(
                    apps_api.create_namespaced_deployment,
                    apps_api.patch_namespaced_deployment,
                    namespace,
                    name,
                    manifest,
                )
                continue

            if manifest["kind"] == "Service":
                self._create_or_patch(
                    core_api.create_namespaced_service,
                    core_api.patch_namespaced_service,
                    namespace,
                    name,
                    manifest,
                )

        await self._sync_ingress(namespace)

    async def remove(self, organization: str, application: str) -> None:
        """Remove one application deployment from an organization namespace."""
        namespace = self._namespace_name(organization)
        name = self._application_name(application)

        await self._ensure_namespace(namespace)
        apps_api = self._apps_api()
        core_api = self._namespace_api()
        self._delete_if_exists(apps_api.delete_namespaced_deployment, namespace, name)
        self._delete_if_exists(core_api.delete_namespaced_service, namespace, name)

        await self._sync_ingress(namespace)

    async def delete(self, organization: str) -> None:
        """Delete the organization namespace and all managed resources."""
        namespace = self._namespace_name(organization)
        core_api = self._namespace_api()
        try:
            core_api.delete_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed deleting namespace '{namespace}'") from exc


parsed_compute_url = urlparse(env.COMPUTE_URL)
root = Compute(
    kube_config_path=env.COMPUTE_KUBE_CONFIG_PATH,
    ingress_host=parsed_compute_url.hostname or "localhost",
)
