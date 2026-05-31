from __future__ import annotations

import yaml
from typing import Any
from datetime import datetime, timezone, UTC
from src.utils import utils
from .__root__ import Root
from kubernetes import client, config
from src.constants import TEMPLATES
from kubernetes.dynamic import DynamicClient
from kubernetes.client.rest import ApiException


class Compute(Root):
    """Manage Kubernetes namespaces and internal application workloads."""

    def __init__(self, kubeconfig: str) -> None:
        """Initialize the Kubernetes compute adapter."""

        super().__init__(kubeconfig=kubeconfig)
        configuration = client.Configuration()
        loader = config.kube_config.KubeConfigLoader(yaml.safe_load(self.kubeconfig))
        loader.load_and_set(configuration)
        self._api_client = client.ApiClient(configuration)
        self._core_api = client.CoreV1Api(self._api_client)
        self._apps_api = client.AppsV1Api(self._api_client)
        self._dynamic_client = DynamicClient(self._api_client)


    def _create_or_patch(self, create_call, patch_call, namespace: str, name: str, body: dict) -> None:
        """Create a resource when missing, otherwise patch the live object."""

        try:
            patch_call(name, namespace, body)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed updating {body['kind']} '{name}'") from exc

            create_call(namespace, body)


    def _namespace_name(self, organization: str) -> str:
        """Validate and return one namespace name."""

        utils.knames(organization, "Org")
        return organization


    def _application_name(self, application: str) -> str:
        """Validate and return one application name."""

        utils.knames(application, "Application name")
        return application


    def _ensure_namespace(self, organization: str) -> None:
        """Create the namespace for one organization when it is missing."""

        namespace = self._namespace_name(organization)

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


    def _pods(self, organization: str, application: str) -> list[client.V1Pod]:
        """Return pods for one managed application."""

        namespace = self._namespace_name(organization)
        name = self._application_name(application)
        return self._core_api.list_namespaced_pod(namespace, label_selector=f"app={name}").items


    async def list(self, organization: str) -> list[str]:
        """List applications deployed in one organization namespace."""

        namespace = self._namespace_name(organization)
        self._ensure_namespace(namespace)
        deployments = self._apps_api.list_namespaced_deployment(
            namespace,
            label_selector="managed-by=control-plane,compute-role=application",
        ).items
        return sorted(deployment.metadata.name for deployment in deployments)


    async def exists(self, organization: str, application: str) -> bool:
        """Return whether one managed application exists."""

        namespace = self._namespace_name(organization)
        name = self._application_name(application)
        try:
            self._apps_api.read_namespaced_deployment(name, namespace)
            self._core_api.read_namespaced_service(name, namespace)
            self._core_api.read_namespaced_secret(name, namespace)
        except ApiException as exc:
            if exc.status == 404:
                return False

            raise ValueError(f"Failed checking application '{namespace}/{name}'") from exc

        return True


    async def create_namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

        self._ensure_namespace(organization)

        # The shared proxy is part of every organization namespace.
        await self.create_proxy(organization)


    async def create_secret(self, organization: str, application: str, values: dict[str, str]) -> None:
        """Create or replace the Secret for one application."""

        namespace = self._namespace_name(organization)
        name = self._application_name(application)

        self._ensure_namespace(namespace)
        self._create_or_patch(
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
                "stringData": values,
            },
        )


    async def create_application(self, organization: str, application: str, image: str, port: int) -> None:
        """Create or replace one internal application Deployment and Service."""

        namespace = self._namespace_name(organization)
        name = self._application_name(application)

        self._ensure_namespace(namespace)
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
                self._create_or_patch(
                    self._apps_api.create_namespaced_deployment,
                    self._apps_api.patch_namespaced_deployment,
                    namespace,
                    name,
                    manifest,
                )
                continue

            if manifest["kind"] == "Service":
                self._create_or_patch(
                    self._core_api.create_namespaced_service,
                    self._core_api.patch_namespaced_service,
                    namespace,
                    name,
                    manifest,
                )


    async def create_proxy(self, organization: str) -> None:
        """Create or replace the shared internal proxy for an organization."""

        namespace = self._namespace_name(organization)
        self._ensure_namespace(namespace)

        manifests = utils.yaml(TEMPLATES / "proxy.yml", namespace=namespace)
        manifests = manifests if isinstance(manifests, list) else [manifests]
        for manifest in manifests:
            if manifest["kind"] == "Deployment":
                self._create_or_patch(
                    self._apps_api.create_namespaced_deployment,
                    self._apps_api.patch_namespaced_deployment,
                    namespace,
                    manifest["metadata"]["name"],
                    manifest,
                )
                continue

            if manifest["kind"] == "Service":
                self._create_or_patch(
                    self._core_api.create_namespaced_service,
                    self._core_api.patch_namespaced_service,
                    namespace,
                    manifest["metadata"]["name"],
                    manifest,
                )


    async def create_cluster_proxy(self, ingress_name: str) -> None:
        """Create or replace the shared cluster-wide proxy entrypoint."""

        manifests = utils.yaml(TEMPLATES / "cluster-proxy.yml", ingress_name=ingress_name)
        manifests = manifests if isinstance(manifests, list) else [manifests]

        # Use the Kubernetes client directly so bootstrap does not depend on kubectl.

        for manifest in manifests:
            resource = self._dynamic_client.resources.get(api_version=manifest["apiVersion"], kind=manifest["kind"])
            name = manifest["metadata"]["name"]
            namespace = manifest["metadata"].get("namespace")

            # Create new objects when missing, otherwise patch them in place.
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


    async def ensure_metrics_server(self) -> None:
        """Install or update the Kubernetes Metrics Server in the cluster."""

        manifests = utils.yaml(TEMPLATES / "metrics-server.yml")
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


    async def create(self, organization: str, application: str, image: str, port: int, values: dict[str, str]) -> None:
        """Create or replace one complete managed application stack."""

        await self.create_namespace(organization)
        await self.create_secret(organization, application, values)
        await self.create_application(organization, application, image, port)


    async def remove(self, organization: str, application: str) -> None:
        """Remove one managed application."""

        namespace = self._namespace_name(organization)
        name = self._application_name(application)

        self._ensure_namespace(namespace)
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

        namespace = self._namespace_name(organization)
        try:
            self._core_api.delete_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed deleting namespace '{namespace}'") from exc


    async def status(self, organization: str, application: str) -> dict[str, Any]:
        """Return runtime status for one managed application."""

        namespace = self._namespace_name(organization)
        name = self._application_name(application)

        pods = self._pods(organization, application)
        pod_statuses = [
            {
                "name": pod.metadata.name,
                "phase": pod.status.phase,
                "ready": [
                    condition.type
                    for condition in (pod.status.conditions or [])
                    if condition.status == "True"
                ],
            }
            for pod in pods
        ]

        return {
            "organization": namespace,
            "application": name,
            "exists": await self.exists(organization, application),
            "pods": pod_statuses,
        }


    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

        namespace = self._namespace_name(organization)
        name = self._application_name(application)
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


    @staticmethod
    def _parse_cpu(cpu_str: str) -> int:
        """Parse Kubernetes CPU string to millicores."""
        cpu_str = cpu_str.strip()
        if cpu_str.endswith("m"):
            return int(cpu_str[:-1])
        return int(float(cpu_str) * 1000)


    @staticmethod
    def _parse_memory(memory_str: str) -> int:
        """Parse Kubernetes memory string to bytes."""
        memory_str = memory_str.strip()
        suffixes = {
            "Ki": 1024,
            "Mi": 1024 ** 2,
            "Gi": 1024 ** 3,
            "Ti": 1024 ** 4,
            "k": 1000,
            "M": 1000 ** 2,
            "G": 1000 ** 3,
            "T": 1000 ** 4,
        }
        for suffix, multiplier in sorted(suffixes.items(), key=lambda x: -len(x[0])):
            if memory_str.endswith(suffix):
                return int(float(memory_str[: -len(suffix)]) * multiplier)
        return int(memory_str)


    async def usage(
        self,
        organization: str | None = None,
        application: str | None = None,
    ) -> dict[str, Any]:
        """Return resource usage for managed compute resources."""

        if organization is None:
            namespaces = self._core_api.list_namespace(
                label_selector="managed-by=control-plane"
            ).items
            orgs = [await self.usage(organization=ns.metadata.name) for ns in namespaces]
            return {
                "organizations": orgs,
                "total_applications": sum(o["total_applications"] for o in orgs),
                "total_pods": sum(o["total_pods"] for o in orgs),
            }

        namespace = self._namespace_name(organization)

        try:
            self._core_api.read_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed reading namespace '{namespace}'") from exc
            return {
                "organization": namespace,
                "applications": [],
                "total_applications": 0,
                "total_pods": 0,
            }

        if application is None:
            deployments = self._apps_api.list_namespaced_deployment(
                namespace,
                label_selector="managed-by=control-plane,compute-role=application",
            ).items
            total_pods = 0
            cpu_requests = 0
            cpu_limits = 0
            mem_requests = 0
            mem_limits = 0
            for dep in deployments:
                app_usage = await self.usage(organization=namespace, application=dep.metadata.name)
                total_pods += app_usage["pods"]["total"]
                r = app_usage["resources"]
                cpu_requests += r["cpu"]["requests_millicores"]
                cpu_limits += r["cpu"]["limits_millicores"]
                mem_requests += r["memory"]["requests_bytes"]
                mem_limits += r["memory"]["limits_bytes"]
            return {
                "organization": namespace,
                "total_applications": len(deployments),
                "total_pods": total_pods,
                "total_cpu": {
                    "requests_millicores": cpu_requests,
                    "limits_millicores": cpu_limits,
                },
                "total_memory": {
                    "requests_bytes": mem_requests,
                    "limits_bytes": mem_limits,
                },
            }

        name = self._application_name(application)
        pods = self._pods(organization, application)
        dep = self._apps_api.read_namespaced_deployment(name, namespace)

        containers = dep.spec.template.spec.containers
        cpu_requests = 0
        cpu_limits = 0
        mem_requests = 0
        mem_limits = 0
        for container in containers:
            resources = container.resources
            if resources:
                if resources.requests:
                    cpu_requests += self._parse_cpu(resources.requests.get("cpu", "0"))
                    mem_requests += self._parse_memory(resources.requests.get("memory", "0"))
                if resources.limits:
                    cpu_limits += self._parse_cpu(resources.limits.get("cpu", "0"))
                    mem_limits += self._parse_memory(resources.limits.get("memory", "0"))

        pod_phases: dict[str, int] = {}
        for pod in pods:
            phase = pod.status.phase or "Unknown"
            pod_phases[phase] = pod_phases.get(phase, 0) + 1

        return {
            "organization": namespace,
            "application": name,
            "replicas": dep.spec.replicas,
            "pods": {
                "total": len(pods),
                "phases": pod_phases,
            },
            "resources": {
                "cpu": {
                    "requests_millicores": cpu_requests,
                    "limits_millicores": cpu_limits,
                },
                "memory": {
                    "requests_bytes": mem_requests,
                    "limits_bytes": mem_limits,
                },
            },
        }
