from __future__ import annotations

import yaml
import asyncio
from urllib import error, request
from datetime import UTC, datetime
from src.utils import utils
from .__root__ import Compute
from kubernetes import client, config
from src.constants import TEMPLATES
from kubernetes.dynamic import DynamicClient
from src.utils.namespace import k8name
from kubernetes.client.rest import ApiException


class K8s(Compute):
    """Manage Kubernetes namespaces and internal application workloads."""

    KONG_VERSION = "v3.5.9"
    KONG_CRD_VERSION = "v1.5.2"
    KONG_NAMESPACE = "kong"
    KONG_PROXY_IMAGE = "kong:3.9"
    KONG_CONTROLLER_IMAGE = "kong/kubernetes-ingress-controller:3.5"

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
        self._dynamic_client = DynamicClient(self._api_client)

    async def setup(self) -> None:
        """Install Kong into the target cluster using Kubernetes API calls."""

        try:
            # Install the CRDs first so Kong custom resources are discoverable.
            await self._apply_remote_manifests(
                f"https://github.com/kong/kubernetes-configuration/config/crd/ingress-controller?ref={self.KONG_CRD_VERSION}",
                cluster_scoped=True,
            )

            # Then install the controller and gateway resources in-cluster.
            for url in (
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/base/namespace.yaml",
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/rbac/leader_election_role.yaml",
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/rbac/leader_election_role_binding.yaml",
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/rbac/role.yaml",
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/rbac/role_binding.yaml",
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/base/serviceaccount.yaml",
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/base/service.yaml",
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/base/ingressclass.yaml",
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/base/validation-service.yaml",
            ):
                await self._apply_remote_manifests(url)

            await self._apply_remote_manifests(
                f"https://raw.githubusercontent.com/Kong/kubernetes-ingress-controller/{self.KONG_VERSION}/config/base/kong-ingress-dbless.yaml",
                replace={
                    "kong-placeholder:placeholder": self.KONG_PROXY_IMAGE,
                    "kic-placeholder:placeholder": self.KONG_CONTROLLER_IMAGE,
                },
            )

            await self._wait_for_deployment("ingress-kong", self.KONG_NAMESPACE)
        except (error.URLError, ApiException, ValueError) as exc:
            raise ValueError("Failed installing Kong ingress controller") from exc


    async def _apply_remote_manifests(self, url: str, cluster_scoped: bool = False, replace: dict[str, str] | None = None) -> None:
        """Fetch and apply one remote YAML bundle."""

        try:
            with request.urlopen(url, timeout=30) as response:
                rendered = response.read().decode("utf-8")
        except error.URLError as exc:
            raise ValueError(f"Failed fetching Kong manifest bundle from {url}") from exc

        if replace is not None:
            for old, new in replace.items():
                rendered = rendered.replace(old, new)

        documents = [document for document in yaml.safe_load_all(rendered) if document is not None]
        for manifest in documents:
            if cluster_scoped and manifest["kind"] == "CustomResourceDefinition":
                await self._apply_crd(manifest)
                continue

            await self._apply_manifest(manifest)


    async def _apply_crd(self, manifest: dict) -> None:
        """Create or replace one custom resource definition."""

        api = client.ApiextensionsV1Api(self._api_client)
        name = manifest["metadata"]["name"]
        try:
            api.read_custom_resource_definition(name)
            api.replace_custom_resource_definition(name, manifest)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed applying CustomResourceDefinition '{name}'") from exc

            api.create_custom_resource_definition(manifest)


    async def _apply_manifest(self, manifest: dict) -> None:
        """Create or replace one manifest through the dynamic Kubernetes client."""

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
            if exc.status not in (404, 409):
                raise ValueError(f"Failed applying {manifest['kind']} '{name}'") from exc

            if exc.status == 409:
                try:
                    if resource.namespaced:
                        resource.delete(name=name, namespace=namespace)
                    else:
                        resource.delete(name=name)
                except ApiException:
                    pass
            if resource.namespaced:
                resource.create(body=manifest, namespace=namespace)
            else:
                resource.create(body=manifest)


    async def _wait_for_deployment(self, name: str, namespace: str) -> None:
        """Wait for one deployment to report at least one available replica."""

        for _ in range(60):
            deployment = self._apps_api.read_namespaced_deployment_status(name, namespace)
            if (deployment.status.available_replicas or 0) > 0 or (deployment.status.ready_replicas or 0) > 0:
                return

            await asyncio.sleep(2)

        raise ValueError(f"Timed out waiting for deployment '{namespace}/{name}'")

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

        kong_manifests = utils.readyml(
            TEMPLATES / "kong.yml",
            name=name,
            namespace=namespace,
            port=port,
            proxy_secret=self._proxy_secret,
        )
        kong_manifests = kong_manifests if isinstance(kong_manifests, list) else [kong_manifests]

        # Apply the Kong consumer, plugin, and ingress that expose the app through the shared gateway.
        for manifest in kong_manifests:
            resource = self._dynamic_client.resources.get(api_version=manifest["apiVersion"], kind=manifest["kind"])
            manifest_name = manifest["metadata"]["name"]
            manifest_namespace = manifest["metadata"].get("namespace")
            try:
                if resource.namespaced:
                    resource.get(name=manifest_name, namespace=manifest_namespace)
                    resource.patch(
                        body=manifest,
                        name=manifest_name,
                        namespace=manifest_namespace,
                        content_type="application/apply-patch+yaml",
                        field_manager="longlink",
                        force=True,
                    )
                else:
                    resource.get(name=manifest_name)
                    resource.patch(
                        body=manifest,
                        name=manifest_name,
                        content_type="application/apply-patch+yaml",
                        field_manager="longlink",
                        force=True,
                    )
            except ApiException as exc:
                if exc.status not in (404, 409):
                    raise ValueError(f"Failed applying {manifest['kind']} '{manifest_name}'") from exc
                if exc.status == 409:
                    try:
                        if resource.namespaced:
                            resource.delete(name=manifest_name, namespace=manifest_namespace)
                        else:
                            resource.delete(name=manifest_name)
                    except ApiException:
                        pass
                if resource.namespaced:
                    resource.create(body=manifest, namespace=manifest_namespace)
                else:
                    resource.create(body=manifest)

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
