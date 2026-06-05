from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from datetime import UTC, datetime

import yaml
from kubernetes import client, config
from kubernetes.client.rest import ApiException
from kubernetes.dynamic import DynamicClient

from src.constants import TEMPLATES
from src.utils.namespace import k8name
from src.utils import utils

from .__root__ import Compute


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
        self._dynamic_client = DynamicClient(self._api_client)

    async def setup(self) -> None:
        """Bootstrap the shared cluster-wide proxy entrypoint."""

        proxy_script = (TEMPLATES / "cluster-proxy.py").read_text(encoding="utf-8")
        manifests = utils.yaml(
            TEMPLATES / "cluster-proxy.yml",
            proxy_script="\n".join(f"    {line}" for line in proxy_script.splitlines()),
            proxy_secret=self._proxy_secret,
        )
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
                if exc.status not in (404, 409):
                    raise ValueError(f"Failed applying {manifest['kind']} '{name}'") from exc
                # Replace conflicting resources so a changed gateway secret can roll out cleanly.
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


    async def cleanup(self) -> None:
        """Delete all Kubernetes resources managed by the control plane."""

        # Remove namespaced resources before namespaces so namespace deletion is not blocked.
        for item in self._core_api.list_config_map_for_all_namespaces(label_selector="managed-by=longlink").items:
            try:
                self._core_api.delete_namespaced_config_map(item.metadata.name, item.metadata.namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting ConfigMap '{item.metadata.namespace}/{item.metadata.name}'") from exc

        for item in self._core_api.list_secret_for_all_namespaces(label_selector="managed-by=longlink").items:
            try:
                self._core_api.delete_namespaced_secret(item.metadata.name, item.metadata.namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting Secret '{item.metadata.namespace}/{item.metadata.name}'") from exc

        for item in self._core_api.list_service_account_for_all_namespaces(label_selector="managed-by=longlink").items:
            try:
                self._core_api.delete_namespaced_service_account(item.metadata.name, item.metadata.namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(
                        f"Failed deleting ServiceAccount '{item.metadata.namespace}/{item.metadata.name}'"
                    ) from exc

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

        # Cluster-scoped bindings must be removed explicitly.
        rbac_api = client.RbacAuthorizationV1Api(self._api_client)
        for item in rbac_api.list_cluster_role_binding(label_selector="managed-by=longlink").items:
            try:
                rbac_api.delete_cluster_role_binding(item.metadata.name)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting ClusterRoleBinding '{item.metadata.name}'") from exc


    def _issue_token(self) -> str:
        """Return a short-lived bearer token for the cluster proxy."""

        header = {"alg": "HS256", "typ": "JWT"}
        payload = {
            "iss": "longlink-control-plane",
            "aud": "longlink-proxy",
            "sub": "compute-router",
            "iat": int(time.time()),
            "exp": int(time.time()) + 60,
        }
        header_b64 = base64.urlsafe_b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8")).rstrip(b"=")
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8")).rstrip(b"=")
        signing_input = b".".join((header_b64, payload_b64))
        signature = hmac.new(self._proxy_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        signature_b64 = base64.urlsafe_b64encode(signature).rstrip(b"=")

        return b".".join((header_b64, payload_b64, signature_b64)).decode("ascii")

    @property
    def token(self) -> str:
        """Return the current short-lived bearer token."""

        return self._issue_token()


    def authorization_header(self) -> str:
        """Return the bearer authorization header value for API requests."""

        return f"Bearer {self._issue_token()}"


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

        api_host = self._api_client.configuration.host.rstrip("/").replace("://0.0.0.0", "://localhost")
        return f"{api_host}/api/v1/namespaces/{namespace}/services/{name}:{port}/proxy/"


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
