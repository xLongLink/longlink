import re
import json
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
from src.kubernetes.resources import FIELD_MANAGER, MANAGED_BY_LABEL, LOCATION_ID_LABEL, KubernetesDocument, KubernetesResources
from src.kubernetes.applications import ENVIRONMENT_NAME, APPLICATION_ID_LABEL, ORGANIZATION_ID_LABEL, Applications

LOAD_BALANCER_TIMEOUT_SECONDS = 300
GATEWAY_ROLLOUT_TIMEOUT_SECONDS = 300
PRUNE_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2
GATEWAY_LABEL = "app"
PROXY_SECRET = re.compile(r"^[A-Za-z0-9_-]+$")
IMMUTABLE_IMAGE = re.compile(r"@sha256:[0-9a-f]{64}$")


@dataclass(frozen=True, slots=True)
class DesiredOrganization:
    """Represent one organization Namespace in location desired state."""

    id: UUID
    slug: str


@dataclass(frozen=True, slots=True)
class DesiredApplication:
    """Represent one application workload in location desired state."""

    id: UUID
    organization_id: UUID
    namespace: str
    image: str
    envs: dict[str, str]


@dataclass(frozen=True, slots=True)
class DesiredLocation:
    """Represent the complete desired Kubernetes state for one immutable location."""

    id: UUID
    organizations: tuple[DesiredOrganization, ...]
    applications: tuple[DesiredApplication, ...]
    deleting: bool = False


@dataclass(frozen=True, slots=True)
class ReconcileResult:
    """Return gateway connection material produced by reconciliation."""

    gateway_url: str | None
    gateway_ca_certificate: str | None
    gateway_tls_certificate: str | None
    gateway_tls_private_key: str | None


def _metadata(resource: APIObject) -> dict[str, Any]:
    """Return validated Kubernetes object metadata at the external document boundary."""

    body: Any = resource.to_dict()
    if not isinstance(body, dict):
        raise TypeError(f"Kubernetes {resource.kind} response must be a mapping")
    metadata = body.get("metadata")
    if not isinstance(metadata, dict):
        raise TypeError(f"Kubernetes {resource.kind} response must include metadata")
    return metadata


def _string_map(metadata: dict[str, Any], field: str) -> dict[str, str]:
    """Return one validated string metadata mapping from a Kubernetes response."""

    value = metadata.get(field, {})
    if not isinstance(value, dict) or not all(isinstance(key, str) and isinstance(item, str) for key, item in value.items()):
        raise TypeError(f"Kubernetes metadata.{field} must map strings to strings")
    return value


def _uid(resource: APIObject) -> str:
    """Return the UID required for a conditional prune deletion."""

    uid = _metadata(resource).get("uid")
    if not isinstance(uid, str) or not uid:
        raise TypeError(f"Kubernetes {resource.kind} response did not include metadata.uid")
    return uid


def _resource_version(resource: APIObject) -> str:
    """Return the resource version used to trigger a workload rollout after dependency repair."""

    resource_version = _metadata(resource).get("resourceVersion")
    if not isinstance(resource_version, str) or not resource_version:
        raise TypeError(f"Kubernetes {resource.kind} response did not include metadata.resourceVersion")
    return resource_version


def _pod_is_active(pod: Pod) -> bool:
    """Return whether one Pod can still start or execute application code."""

    body: Any = pod.to_dict()
    status = body.get("status") if isinstance(body, dict) else None
    phase = status.get("phase") if isinstance(status, dict) else None
    return phase not in {"Succeeded", "Failed"}


def _set_pod_annotation(body: KubernetesDocument, name: str, value: str) -> None:
    """Set one validated pod-template annotation on a desired Deployment."""

    # Deployment templates are internal manifests, but validate their shape before mutation.
    spec = body.get("spec")
    template = spec.get("template") if isinstance(spec, dict) else None
    metadata = template.get("metadata") if isinstance(template, dict) else None
    if not isinstance(metadata, dict):
        raise TypeError("Desired Deployment must include spec.template.metadata")
    annotations = metadata.setdefault("annotations", {})
    if not isinstance(annotations, dict):
        raise TypeError("Desired Deployment pod annotations must be a mapping")
    annotations[name] = value


def _named_items(document: dict[str, Any], field: str) -> dict[str, dict[str, Any]]:
    """Return one pod-spec list indexed by required unique item names."""

    items = document.get(field, [])
    if not isinstance(items, list):
        raise TypeError(f"Kubernetes pod spec {field} must be a list")
    indexed: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            raise TypeError(f"Kubernetes pod spec {field} entries must have names")
        indexed[item["name"]] = item
    return indexed


def _deployment_shape_matches(desired: KubernetesDocument, actual: APIObject) -> bool:
    """Return whether security-critical pod lists exactly match the desired Deployment shape."""

    actual_body: Any = actual.to_dict()
    desired_spec = desired.get("spec")
    actual_spec = actual_body.get("spec") if isinstance(actual_body, dict) else None
    desired_template = desired_spec.get("template") if isinstance(desired_spec, dict) else None
    actual_template = actual_spec.get("template") if isinstance(actual_spec, dict) else None
    desired_pod = desired_template.get("spec") if isinstance(desired_template, dict) else None
    actual_pod = actual_template.get("spec") if isinstance(actual_template, dict) else None
    if not isinstance(desired_pod, dict) or not isinstance(actual_pod, dict):
        return False
    for field in ("containers", "initContainers", "volumes"):
        desired_items = _named_items(desired_pod, field)
        actual_items = _named_items(actual_pod, field)
        if desired_items.keys() != actual_items.keys():
            return False
        if field == "volumes":
            continue
        for name, desired_container in desired_items.items():
            actual_container = actual_items[name]
            for list_field in ("env", "envFrom", "ports", "volumeMounts"):
                desired_list = desired_container.get(list_field, [])
                actual_list = actual_container.get(list_field, [])
                if not isinstance(desired_list, list) or not isinstance(actual_list, list):
                    return False
                if list_field == "env":
                    desired_values = sorted(
                        (item.get("name"), item.get("value"), json.dumps(item.get("valueFrom"), sort_keys=True))
                        for item in desired_list
                        if isinstance(item, dict)
                    )
                    actual_values = sorted(
                        (item.get("name"), item.get("value"), json.dumps(item.get("valueFrom"), sort_keys=True))
                        for item in actual_list
                        if isinstance(item, dict)
                    )
                elif list_field == "envFrom":
                    desired_values = sorted(json.dumps(item, sort_keys=True) for item in desired_list)
                    actual_values = sorted(json.dumps(item, sort_keys=True) for item in actual_list)
                elif list_field == "ports":
                    desired_values = sorted(
                        (item.get("name"), item.get("containerPort")) for item in desired_list if isinstance(item, dict)
                    )
                    actual_values = sorted((item.get("name"), item.get("containerPort")) for item in actual_list if isinstance(item, dict))
                else:
                    desired_values = sorted((item.get("name"), item.get("mountPath")) for item in desired_list if isinstance(item, dict))
                    actual_values = sorted((item.get("name"), item.get("mountPath")) for item in actual_list if isinstance(item, dict))
                if desired_values != actual_values or len(desired_values) != len(desired_list) or len(actual_values) != len(actual_list):
                    return False
    return True


class Reconciler:
    """Converge one connected cluster to a location's complete desired state."""

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize reconciliation with one cluster resource boundary."""

        self._resources = resources
        self._gateway = gateway.Gateway()
        self._applications = Applications(resources)

    async def reconcile(
        self,
        desired: DesiredLocation,
        proxy_secret: str,
        existing_tls: gateway.GatewayTLSMaterial | None = None,
        fence: Callable[[], Awaitable[None]] | None = None,
        stage_tls: Callable[[gateway.GatewayTLSMaterial], Awaitable[None]] | None = None,
    ) -> ReconcileResult:
        """Apply, verify, and then prune one full location desired state."""

        # Validate the entire desired graph before connecting to or changing the cluster.
        self._validate(desired, proxy_secret)
        location_id = str(desired.id)
        platform_version = env.VERSION

        # The system Namespace is an immutable location claim and is never adopted implicitly.
        system_namespace = self._gateway.system_namespace(location_id, platform_version)
        await self._claim_namespace(system_namespace, location_id, fence)

        # Deletion removes all LongLink resources and releases the cluster ownership Namespace last.
        if desired.deleting:
            await self._prune(desired, fence)
            claimed_namespace = await self._resources.read(Namespace, gateway.GATEWAY_NAMESPACE)
            if claimed_namespace is not None:
                await self._check_fence(fence)
                await self._resources.delete(Namespace, claimed_namespace.name, uid=_uid(claimed_namespace))
                await self._wait_for_namespace_deletion(claimed_namespace.name)
            return ReconcileResult(
                gateway_url=None,
                gateway_ca_certificate=None,
                gateway_tls_certificate=None,
                gateway_tls_private_key=None,
            )

        # Create the standard public Service before workloads because cloud address allocation is asynchronous.
        initial_service = self._gateway.service(location_id, self._gateway.initial_service_revision(), platform_version)
        await self._check_fence(fence)
        await self._resources.apply(initial_service)
        endpoint = await self._wait_for_gateway_endpoint()
        tls = self._gateway.tls(location_id, endpoint, existing_tls)
        if tls != existing_tls and stage_tls is not None:
            await self._check_fence(fence)
            await stage_tls(tls)

        # Claim organization Namespaces before applying their namespaced policies and workloads.
        organization_manifests = [
            self._applications.organization_manifests(organization, location_id, platform_version)
            for organization in sorted(desired.organizations, key=lambda item: item.slug)
        ]
        for manifests in organization_manifests:
            await self._claim_namespace(manifests.namespace, location_id, fence)
            await self._check_fence(fence)
            await self._resources.apply(manifests.network_policy)

        # Replace each application Secret exactly before server-side applying its workload resources.
        for application in sorted(desired.applications, key=lambda item: (item.namespace, str(item.id))):
            manifests = self._applications.manifests(application, location_id, proxy_secret, platform_version)
            await self._check_fence(fence)
            secret = await self._resources.replace_secret(manifests.secret)
            _set_pod_annotation(manifests.deployment, "longlink.io/secret-resource-version", _resource_version(secret))
            await self._check_fence(fence)
            await self._apply_deployment(manifests.deployment, fence)
            await self._check_fence(fence)
            await self._resources.apply(manifests.service)

        # Gateway configuration is derived only from desired applications, never from live Service discovery.
        envoy_config = self._gateway.config(desired.applications)
        gateway_manifests = self._gateway.manifests(location_id, proxy_secret, tls, envoy_config, platform_version)
        await self._check_fence(fence)
        auth_secret = await self._resources.replace_secret(gateway_manifests.auth_secret)
        await self._check_fence(fence)
        tls_secret = await self._resources.replace_secret(gateway_manifests.tls_secret)
        await self._check_fence(fence)
        config_map = await self._resources.apply(gateway_manifests.config_map)
        _set_pod_annotation(gateway_manifests.deployment, "longlink.io/auth-resource-version", _resource_version(auth_secret))
        _set_pod_annotation(gateway_manifests.deployment, "longlink.io/tls-resource-version", _resource_version(tls_secret))
        _set_pod_annotation(gateway_manifests.deployment, "longlink.io/config-resource-version", _resource_version(config_map))
        await self._check_fence(fence)
        await self._apply_deployment(gateway_manifests.deployment, fence)
        await self._check_fence(fence)
        await self._resources.apply(gateway_manifests.service)
        await self._check_fence(fence)
        await self._resources.apply(gateway_manifests.network_policy)

        # Pruning starts only after the desired gateway revision is observed and fully ready.
        await self._wait_for_gateway_rollout(gateway_manifests.runtime_revision)
        await self._prune(desired, fence)
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

    def _validate(self, desired: DesiredLocation, proxy_secret: str) -> None:
        """Validate desired identities, relationships, and Kubernetes-safe values."""

        # A deleting location must present an empty desired graph.
        if desired.deleting and (desired.organizations or desired.applications):
            raise ValueError("Deleting location desired state must not contain organizations or applications")

        # Active gateways use the platform's URL-safe generated bearer secret in an init substitution.
        if not desired.deleting and (not proxy_secret or PROXY_SECRET.fullmatch(proxy_secret) is None):
            raise ValueError("Gateway proxy secret must contain only letters, numbers, underscores, and hyphens")

        # Organization IDs and namespace slugs must both be unique and cannot target system namespaces.
        organizations_by_id: dict[UUID, DesiredOrganization] = {}
        namespaces: set[str] = set()
        for organization in desired.organizations:
            names.knames(organization.slug)
            if organization.id in organizations_by_id:
                raise ValueError(f"Duplicate desired organization ID {organization.id}")
            if organization.slug in namespaces:
                raise ValueError(f"Duplicate desired organization namespace {organization.slug!r}")
            organizations_by_id[organization.id] = organization
            namespaces.add(organization.slug)

        # Applications must be unique, belong to a desired organization, and use its exact Namespace.
        application_ids: set[UUID] = set()
        for application in desired.applications:
            if application.id in application_ids:
                raise ValueError(f"Duplicate desired application ID {application.id}")
            organization = organizations_by_id.get(application.organization_id)
            if organization is None:
                raise ValueError(f"Desired application {application.id} references an unknown organization")
            if application.namespace != organization.slug:
                raise ValueError(f"Desired application {application.id} namespace does not match its organization")
            if not application.image.strip():
                raise ValueError(f"Desired application {application.id} image must not be empty")
            if not env.DEVELOPMENT and IMMUTABLE_IMAGE.search(application.image) is None:
                raise ValueError(f"Desired application {application.id} image must use an immutable digest")
            invalid_envs = sorted(name for name in application.envs if ENVIRONMENT_NAME.fullmatch(name) is None)
            if invalid_envs:
                raise ValueError(f"Desired application {application.id} has invalid environment names: {', '.join(invalid_envs)}")
            if not all(isinstance(value, str) for value in application.envs.values()):
                raise TypeError(f"Desired application {application.id} environment values must be strings")
            application_ids.add(application.id)

    async def _claim_namespace(
        self,
        body: KubernetesDocument,
        location_id: str,
        fence: Callable[[], Awaitable[None]] | None,
    ) -> None:
        """Create or update a Namespace only when its location ownership is unambiguous."""

        # Read and validate ownership before server-side apply can claim metadata fields.
        metadata = body.get("metadata")
        if not isinstance(metadata, dict):
            raise TypeError("Desired Namespace metadata must be a mapping")
        name = metadata.get("name")
        if not isinstance(name, str) or not name:
            raise TypeError("Desired Namespace metadata.name must be a non-empty string")
        existing = await self._resources.read(Namespace, name)
        if existing is not None:
            labels = _string_map(_metadata(existing), "labels")
            if labels.get(MANAGED_BY_LABEL) != FIELD_MANAGER or labels.get(LOCATION_ID_LABEL) != location_id:
                raise ValueError(f"Kubernetes Namespace {name!r} is not owned by location {location_id}")
        await self._check_fence(fence)
        await self._resources.apply(body)

    async def _check_fence(self, fence: Callable[[], Awaitable[None]] | None) -> None:
        """Verify operation ownership before issuing one Kubernetes mutation."""

        # Direct integration callers can omit a fence because they own the reconciliation call synchronously.
        if fence is not None:
            await fence()

    async def _apply_deployment(
        self,
        body: KubernetesDocument,
        fence: Callable[[], Awaitable[None]] | None,
    ) -> Deployment:
        """Apply one Deployment and recreate it when foreign pod-list entries survive SSA."""

        applied = await self._resources.apply(body)
        if not isinstance(applied, Deployment):
            raise TypeError("Kubernetes Deployment apply returned an unexpected resource kind")
        if _deployment_shape_matches(body, applied):
            return applied

        # Recreate exclusively owned Deployments so injected sidecars and list drift cannot survive reconciliation.
        await self._check_fence(fence)
        await self._resources.delete(Deployment, applied.name, applied.namespace, _uid(applied))
        deadline = time.monotonic() + PRUNE_TIMEOUT_SECONDS
        while await self._resources.read(Deployment, applied.name, applied.namespace) is not None:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Kubernetes Deployment {applied.name!r} did not terminate before recreation")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
        await self._check_fence(fence)
        recreated = await self._resources.apply(body)
        if not isinstance(recreated, Deployment) or not _deployment_shape_matches(body, recreated):
            raise RuntimeError(f"Kubernetes Deployment {applied.name!r} retained unexpected pod entries")
        return recreated

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
                metadata = body.get("metadata", {})
                spec = body.get("spec", {})
                status = body.get("status", {})
                annotations = metadata.get("annotations", {}) if isinstance(metadata, dict) else {}
                template = spec.get("template", {}) if isinstance(spec, dict) else {}
                template_metadata = template.get("metadata", {}) if isinstance(template, dict) else {}
                template_annotations = template_metadata.get("annotations", {}) if isinstance(template_metadata, dict) else {}
                generation = metadata.get("generation") if isinstance(metadata, dict) else None
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

    async def _prune(self, desired: DesiredLocation, fence: Callable[[], Awaitable[None]] | None) -> None:
        """Delete obsolete known resources and organization Namespaces with UID preconditions."""

        location_id = str(desired.id)
        desired_namespaces = {organization.slug for organization in desired.organizations}
        owned_namespaces = await self._resources.list_owned(Namespace, location_id)

        # Only Namespaces with a valid organization identity are eligible for workload or Namespace pruning.
        organization_namespaces: list[Namespace] = []
        for namespace in owned_namespaces:
            if namespace.name == gateway.GATEWAY_NAMESPACE or namespace.name in names.KUBERNETES_SYSTEM_NAMESPACES:
                continue
            labels = _string_map(_metadata(namespace), "labels")
            organization_id = labels.get(ORGANIZATION_ID_LABEL)
            if organization_id is None:
                continue
            try:
                UUID(organization_id)
            except ValueError:
                continue
            organization_namespaces.append(namespace)

        # Prune only canonical app Deployment, Service, and Secret names inside owned organization Namespaces.
        desired_applications = {str(application.id): application for application in desired.applications}
        removed_applications: set[tuple[str, str]] = set()
        removed_namespaces: set[str] = set()
        for namespace in organization_namespaces:
            for resource_class in (Deployment, Service, Secret):
                resources = await self._resources.list_owned(resource_class, location_id, namespace.name)
                for resource in resources:
                    labels = _string_map(_metadata(resource), "labels")
                    application_id = labels.get(APPLICATION_ID_LABEL)
                    if application_id is None:
                        continue
                    try:
                        canonical_id = str(UUID(application_id))
                    except ValueError:
                        continue
                    expected_name = f"app-{canonical_id}" if resource_class is Service else canonical_id
                    if resource.name != expected_name:
                        continue
                    application = desired_applications.get(canonical_id)
                    if application is not None and application.namespace == namespace.name:
                        continue
                    removed_applications.add((canonical_id, namespace.name))
                    await self._check_fence(fence)
                    await self._resources.delete(resource_class, resource.name, namespace.name, _uid(resource))

        # Organization ingress policy is known by its fixed name and remains only in desired Namespaces.
        for namespace in organization_namespaces:
            policies = await self._resources.list_owned(NetworkPolicy, location_id, namespace.name)
            for policy in policies:
                if policy.name == "longlink-gateway-ingress" and namespace.name not in desired_namespaces:
                    await self._check_fence(fence)
                    await self._resources.delete(NetworkPolicy, policy.name, namespace.name, _uid(policy))

        # Gateway kinds are limited to resources carrying the gateway label in the claimed system Namespace.
        gateway_resources: tuple[tuple[type[APIObject], set[str]], ...] = (
            (ConfigMap, {gateway.GATEWAY_NAME}),
            (Secret, {gateway.GATEWAY_AUTH_SECRET_NAME, gateway.GATEWAY_TLS_SECRET_NAME}),
            (Deployment, {gateway.GATEWAY_NAME}),
            (Service, {gateway.GATEWAY_NAME}),
            (NetworkPolicy, {"longlink-gateway-ingress"}),
        )
        for resource_class, active_names in gateway_resources:
            resources = await self._resources.list_owned(resource_class, location_id, gateway.GATEWAY_NAMESPACE)
            for resource in resources:
                labels = _string_map(_metadata(resource), "labels")
                if labels.get(GATEWAY_LABEL) != gateway.GATEWAY_NAME:
                    continue
                if not desired.deleting and resource.name in active_names:
                    continue
                await self._check_fence(fence)
                await self._resources.delete(resource_class, resource.name, gateway.GATEWAY_NAMESPACE, _uid(resource))

        # Namespace deletion is last so failures above never hide unpruned child resources.
        for namespace in organization_namespaces:
            if namespace.name not in desired_namespaces:
                removed_namespaces.add(namespace.name)
                await self._check_fence(fence)
                await self._resources.delete(Namespace, namespace.name, uid=_uid(namespace))

        # Provider cleanup starts only after workload Pods and requested Namespaces have actually disappeared.
        await self._wait_for_prune(removed_applications, removed_namespaces, desired.deleting)

    async def _wait_for_prune(
        self,
        applications: set[tuple[str, str]],
        namespaces: set[str],
        deleting_gateway: bool,
    ) -> None:
        """Wait boundedly for pruned workloads and Namespaces to disappear."""

        deadline = time.monotonic() + PRUNE_TIMEOUT_SECONDS
        while True:
            pending = False
            for application_id, namespace in applications:
                namespace_resource = await self._resources.read(Namespace, namespace)
                if namespace_resource is None:
                    continue
                resources = [
                    await self._resources.read(Deployment, application_id, namespace),
                    await self._resources.read(Service, f"app-{application_id}", namespace),
                    await self._resources.read(Secret, application_id, namespace),
                ]
                pods = await self._resources.list(Pod, namespace, {APPLICATION_ID_LABEL: application_id})
                pending = pending or any(resource is not None for resource in resources) or any(_pod_is_active(pod) for pod in pods)
            for namespace in namespaces:
                pending = pending or await self._resources.read(Namespace, namespace) is not None
            if deleting_gateway:
                gateway_pods = await self._resources.list(Pod, gateway.GATEWAY_NAMESPACE, {GATEWAY_LABEL: gateway.GATEWAY_NAME})
                pending = pending or any(_pod_is_active(pod) for pod in gateway_pods)
            if not pending:
                return
            if time.monotonic() >= deadline:
                raise TimeoutError("Pruned Kubernetes resources did not terminate before the reconciliation timeout")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def _wait_for_namespace_deletion(self, namespace: str) -> None:
        """Wait boundedly for one deleted Namespace and its finalizers."""

        deadline = time.monotonic() + PRUNE_TIMEOUT_SECONDS
        while await self._resources.read(Namespace, namespace) is not None:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Kubernetes Namespace {namespace!r} did not terminate before the reconciliation timeout")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
