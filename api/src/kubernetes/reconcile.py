import re
import time
import asyncio
import ipaddress
from uuid import UUID
from typing import Any
from src.utils import names
from dataclasses import dataclass
from src.kubernetes import gateway
from collections.abc import Callable, Awaitable
from src.environments import env
from kr8s.asyncio.objects import Pod, Secret, Service, APIObject, ConfigMap, Namespace, Deployment, NetworkPolicy
from src.kubernetes.resources import (
    ResourceScope,
    KubernetesResources,
    uid,
    metadata,
    string_map,
    pod_is_active,
    resource_version,
    set_pod_annotation,
)

LOAD_BALANCER_TIMEOUT_SECONDS = 300
GATEWAY_ROLLOUT_TIMEOUT_SECONDS = 300
RESOURCE_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2
GATEWAY_LABEL = "app"
PROXY_SECRET = re.compile(r"^[A-Za-z0-9_-]+$")


@dataclass(frozen=True, slots=True)
class DesiredGatewayRoute:
    """Describe one Application Service route without carrying workload configuration."""

    id: UUID
    namespace: str


@dataclass(frozen=True, slots=True)
class DesiredCompute:
    """Describe gateway and cluster-bootstrap state for one compute target."""

    id: UUID
    routes: tuple[DesiredGatewayRoute, ...]
    deleting: bool = False


@dataclass(frozen=True, slots=True)
class ReconcileResult:
    """Carry the gateway endpoint and TLS identity across compute reconciliation.

    All fields are absent after compute deletion.
    """

    gateway_url: str | None
    gateway_ca_certificate: str | None
    gateway_tls_certificate: str | None
    gateway_tls_private_key: str | None


class Reconciler:
    """Converge only cluster bootstrap and gateway resources for one compute target."""

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize reconciliation with one cluster resource boundary."""

        self._resources = resources
        self._gateway = gateway.Gateway()

    async def reconcile(
        self,
        desired: DesiredCompute,
        proxy_secret: str,
        existing_tls: gateway.GatewayTLSMaterial | None = None,
        stage_tls: Callable[[gateway.GatewayTLSMaterial], Awaitable[None]] | None = None,
    ) -> ReconcileResult:
        """Converge gateway resources without reading or mutating Organization or Application resources."""

        # Validate the complete gateway input before connecting to or changing the cluster.
        self._validate(desired, proxy_secret)
        compute_id = str(desired.id)
        platform_version = env.VERSION

        # Compute deletion never recreates a missing system Namespace and never sweeps tenant resources.
        if desired.deleting:
            system_namespace = await self._resources.read_owned(
                Namespace,
                gateway.GATEWAY_NAMESPACE,
                compute_id,
                ResourceScope.platform,
            )
            if system_namespace is None:
                return ReconcileResult(None, None, None, None)
            await self._prune(desired)
            await self._resources.delete(Namespace, system_namespace.name, uid=uid(system_namespace))
            await self._wait_for_namespace_deletion(system_namespace.name)
            return ReconcileResult(None, None, None, None)

        # The system Namespace is the immutable compute claim for gateway and bootstrap resources.
        system_namespace = await self._resources.apply(self._gateway.system_namespace(compute_id, platform_version))
        if not isinstance(system_namespace, Namespace):
            raise TypeError("Kubernetes Namespace apply returned an unexpected resource kind")

        # Create the public Service before workloads because cloud address allocation is asynchronous.
        await self._resources.apply(self._gateway.service(compute_id, platform_version))
        endpoint = await self._wait_for_gateway_endpoint()
        tls = self._gateway.tls(compute_id, endpoint, existing_tls)
        if tls != existing_tls and stage_tls is not None:
            await stage_tls(tls)

        # Gateway routes target stable Application Service DNS names without discovering tenant resources.
        envoy_config = self._gateway.config(desired.routes)
        manifests = self._gateway.manifests(compute_id, proxy_secret, tls, envoy_config, platform_version)
        auth_secret = await self._resources.replace_secret(manifests.auth_secret)
        tls_secret = await self._resources.replace_secret(manifests.tls_secret)
        config_map = await self._resources.apply(manifests.config_map)
        set_pod_annotation(manifests.deployment, "longlink.io/auth-resource-version", resource_version(auth_secret))
        set_pod_annotation(manifests.deployment, "longlink.io/tls-resource-version", resource_version(tls_secret))
        set_pod_annotation(manifests.deployment, "longlink.io/config-resource-version", resource_version(config_map))
        await self._resources.apply_deployment(manifests.deployment)
        await self._resources.apply(manifests.network_policy)

        # Prune only obsolete Platform-owned gateway resources after the desired rollout is ready.
        await self._wait_for_gateway_rollout(manifests.runtime_revision)
        await self._prune(desired)
        try:
            parsed_endpoint = ipaddress.ip_address(endpoint)
        except ValueError:
            parsed_endpoint = None
        gateway_host = f"[{endpoint}]" if parsed_endpoint is not None and parsed_endpoint.version == 6 else endpoint
        return ReconcileResult(
            gateway_url=f"https://{gateway_host}",
            gateway_ca_certificate=tls.ca_certificate,
            gateway_tls_certificate=tls.certificate,
            gateway_tls_private_key=tls.private_key,
        )

    def _validate(self, desired: DesiredCompute, proxy_secret: str) -> None:
        """Validate gateway identities and Kubernetes-safe route values."""

        # Deleted computes cannot continue publishing Application routes.
        if desired.deleting and desired.routes:
            raise ValueError("Deleting compute desired state must not contain routes")

        # Active gateways use the Platform's URL-safe generated bearer secret in an init substitution.
        if not desired.deleting and (not proxy_secret or PROXY_SECRET.fullmatch(proxy_secret) is None):
            raise ValueError("Gateway proxy secret must contain only letters, numbers, underscores, and hyphens")

        # Gateway routes need unique Application IDs and valid backend Namespaces.
        route_ids: set[UUID] = set()
        for route in desired.routes:
            names.knames(route.namespace)
            if route.id in route_ids:
                raise ValueError(f"Duplicate desired gateway route Application ID {route.id}")
            route_ids.add(route.id)

    async def _wait_for_gateway_endpoint(self) -> str:
        """Wait boundedly for a load-balancer hostname or IP address."""

        # Poll the Service status because provider allocation completes after the apply response.
        deadline = time.monotonic() + LOAD_BALANCER_TIMEOUT_SECONDS
        while True:
            service = await self._resources.read(Service, gateway.GATEWAY_NAME, gateway.GATEWAY_NAMESPACE)
            if service is None:
                raise RuntimeError("Gateway LoadBalancer Service disappeared while awaiting an endpoint")
            body: Any = service.to_dict()
            status = body.get("status", {}) if isinstance(body, dict) else {}
            load_balancer = status.get("loadBalancer", {}) if isinstance(status, dict) else {}
            ingress = load_balancer.get("ingress", []) if isinstance(load_balancer, dict) else []
            if isinstance(ingress, list):
                for entry in ingress:
                    if not isinstance(entry, dict):
                        continue
                    for field in ("hostname", "ip"):
                        value = entry.get(field)
                        if isinstance(value, str) and value.strip():
                            return value.strip().rstrip(".")
            if time.monotonic() >= deadline:
                raise TimeoutError("Gateway LoadBalancer did not publish an endpoint before the reconciliation timeout")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def _wait_for_gateway_rollout(self, runtime_revision: str) -> None:
        """Wait boundedly for the desired gateway Deployment revision to become ready."""

        # A ready old ReplicaSet is insufficient; metadata and pod template revisions must both match.
        deadline = time.monotonic() + GATEWAY_ROLLOUT_TIMEOUT_SECONDS
        while True:
            deployment = await self._resources.read(Deployment, gateway.GATEWAY_NAME, gateway.GATEWAY_NAMESPACE)
            if deployment is None:
                raise RuntimeError("Gateway Deployment disappeared during rollout")
            body: Any = deployment.to_dict()
            if isinstance(body, dict):
                current_metadata = body.get("metadata", {})
                spec = body.get("spec", {})
                status = body.get("status", {})
                annotations = current_metadata.get("annotations", {}) if isinstance(current_metadata, dict) else {}
                template = spec.get("template", {}) if isinstance(spec, dict) else {}
                template_metadata = template.get("metadata", {}) if isinstance(template, dict) else {}
                template_annotations = template_metadata.get("annotations", {}) if isinstance(template_metadata, dict) else {}
                generation = current_metadata.get("generation") if isinstance(current_metadata, dict) else None
                replicas = spec.get("replicas", 1) if isinstance(spec, dict) else None
                observed_generation = status.get("observedGeneration") if isinstance(status, dict) else None
                if (
                    isinstance(generation, int)
                    and isinstance(replicas, int)
                    and isinstance(observed_generation, int)
                    and observed_generation >= generation
                    and annotations.get("longlink.io/runtime-revision") == runtime_revision
                    and template_annotations.get("longlink.io/runtime-revision") == runtime_revision
                    and status.get("updatedReplicas") == replicas
                    and status.get("readyReplicas") == replicas
                    and status.get("availableReplicas") == replicas
                ):
                    return
            if time.monotonic() >= deadline:
                raise TimeoutError("Gateway Deployment did not become ready before the reconciliation timeout")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def _prune(self, desired: DesiredCompute) -> None:
        """Prune only obsolete Platform-owned gateway resources."""

        # Platform resources require the gateway label and a canonical kind and name.
        compute_id = str(desired.id)
        gateway_resources: tuple[tuple[type[APIObject], set[str]], ...] = (
            (ConfigMap, {gateway.GATEWAY_NAME}),
            (Secret, {gateway.GATEWAY_AUTH_SECRET_NAME, gateway.GATEWAY_TLS_SECRET_NAME}),
            (Deployment, {gateway.GATEWAY_NAME}),
            (Service, {gateway.GATEWAY_NAME}),
            (NetworkPolicy, {"longlink-gateway-ingress"}),
        )
        for resource_class, active_names in gateway_resources:
            resources = await self._resources.list_owned(
                resource_class,
                compute_id,
                ResourceScope.platform,
                gateway.GATEWAY_NAMESPACE,
            )
            for resource in resources:
                labels = string_map(metadata(resource), "labels")
                if labels.get(GATEWAY_LABEL) != gateway.GATEWAY_NAME:
                    continue
                if not desired.deleting and resource.name in active_names:
                    continue
                await self._resources.delete(resource_class, resource.name, gateway.GATEWAY_NAMESPACE, uid(resource))

        # Compute deletion waits until no gateway Pod can continue serving requests.
        if desired.deleting:
            deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
            while True:
                pods = await self._resources.list(Pod, gateway.GATEWAY_NAMESPACE, {GATEWAY_LABEL: gateway.GATEWAY_NAME})
                if not any(pod_is_active(pod) for pod in pods):
                    return
                if time.monotonic() >= deadline:
                    raise TimeoutError("Gateway Pods did not terminate before compute deletion")
                await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def _wait_for_namespace_deletion(self, namespace: str) -> None:
        """Wait boundedly for one deleted Namespace and its finalizers."""

        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while await self._resources.read(Namespace, namespace) is not None:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Kubernetes Namespace {namespace!r} did not terminate before deletion")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
