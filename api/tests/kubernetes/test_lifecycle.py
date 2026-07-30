import ssl
import time
import httpx2
import pytest
import asyncio
import ipaddress
from uuid import UUID
from pathlib import Path
from tempfile import TemporaryDirectory
from containers import DockerRuntimeContainer, require_docker_daemon, wait_for_container_log
from dataclasses import dataclass
from collections.abc import Iterator
from src.models.computes import kubeconfig_mapping
from kr8s.asyncio.objects import Secret, Service, APIObject, ConfigMap, Namespace, Deployment, NetworkPolicy
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute, GatewayTLSMaterial, generate_gateway_tls

pytestmark = [pytest.mark.no_db, pytest.mark.integration]
K3S_IMAGE = "rancher/k3s:v1.31.5-k3s1"
ECHO_SERVER_IMAGE = "ealen/echo-server:0.9.2"
K3S_HOST = "127.0.0.1"
K3S_PORT = 6443
K3S_GATEWAY_PORT = 443


@dataclass(frozen=True, slots=True)
class KubernetesScenario:
    """Carry stable identities across one real-cluster lifecycle scenario."""

    compute: Kubernetes
    gateway_port: int
    compute_id: UUID
    organization_id: UUID
    application_id: UUID
    stale_application_id: UUID


@dataclass(frozen=True, slots=True)
class GatewayState:
    """Carry the public IP and TLS identity across gateway lifecycle phases."""

    ip: ipaddress.IPv4Address | ipaddress.IPv6Address
    tls: GatewayTLSMaterial


async def apply_gateway(
    compute: Kubernetes,
    compute_id: UUID,
    routes: tuple[GatewayRoute, ...],
    tls_material: GatewayTLSMaterial | None = None,
) -> GatewayState:
    """Apply gateway resources and retain their public endpoint and TLS identity."""

    # Kubernetes lifecycle methods wait only on the resources they mutate.
    gateway_ip = await compute.gateway.ip()
    tls = tls_material or generate_gateway_tls(compute_id, gateway_ip)
    await compute.gateway.apply(routes, tls)
    return GatewayState(gateway_ip, tls)


async def read_resource(
    compute: Kubernetes,
    resource_class: type[APIObject],
    name: str,
    namespace: str | None = None,
) -> APIObject | None:
    """Read one Kubernetes resource directly for integration assertions."""

    # Construct the typed resource against the test cluster and normalize absence.
    resource = resource_class(name, namespace=namespace if resource_class.namespaced else None, api=await compute.api())
    if not await resource.exists():
        return None
    await resource.refresh()
    return resource


async def delete_gateway_resources(compute: Kubernetes) -> None:
    """Delete gateway resources created only for the real-cluster lifecycle test."""

    # Keep destructive namespace cleanup outside the production gateway abstraction.
    resource = Namespace("longlink-system", api=await compute.api())
    if await resource.exists():
        await resource.delete()


class K3SRuntimeContainer(DockerRuntimeContainer):
    """Run a k3s server container for Kubernetes tests."""

    def __init__(self, image: str) -> None:
        """Configure the k3s server container."""

        super().__init__(
            image,
            command=(
                f"server --disable traefik --disable metrics-server --disable local-storage --tls-san={K3S_HOST} "
                f"--node-external-ip={K3S_HOST} --kubelet-arg=eviction-hard=nodefs.available<1%,imagefs.available<1% "
                "--kubelet-arg=image-gc-high-threshold=99 --kubelet-arg=image-gc-low-threshold=98"
            ),
            environment={"K3S_URL": f"https://{K3S_HOST}:{K3S_PORT}"},
            ports=[K3S_PORT, K3S_GATEWAY_PORT],
            privileged=True,
            tmpfs={"/run": "", "/var/run": ""},
        )

    def start(self) -> "K3SRuntimeContainer":
        """Start k3s and wait until the server reports readiness."""

        super().start()
        ready = False
        try:
            wait_for_container_log(self, "Node controller sync successful", 120)
            ready = True
        finally:
            # Remove a failed k3s container without hiding its startup or readiness error.
            if not ready:
                self.stop()

        return self

    def config_yaml(self) -> str:
        """Return kubeconfig content that points at the published host port."""

        # Read and validate the kubeconfig command result from the k3s server.
        exit_code, output = self.execute(["cat", "/etc/rancher/k3s/k3s.yaml"])
        if exit_code:
            raise RuntimeError(f"Failed reading k3s kubeconfig: {output}")

        # Rewrite the container loopback endpoint to the published host port.
        return output.replace(
            f"https://127.0.0.1:{K3S_PORT}",
            f"https://{self.host()}:{self.port(K3S_PORT)}",
        )


@pytest.fixture
def kubernetes_compute() -> Iterator[tuple[Kubernetes, int]]:
    """Start k3s and return its Kubernetes client and published HTTPS gateway port."""

    # Skip only when the Docker daemon cannot be reached.
    require_docker_daemon()

    # Avoid binding host cgroups so nested pod sandboxes start reliably under Docker.
    container = K3SRuntimeContainer(K3S_IMAGE)
    container.start()

    try:
        yield Kubernetes(kubeconfig_mapping(container.config_yaml())), container.port(K3S_GATEWAY_PORT)
    finally:
        container.stop()


async def deploy_scenario(scenario: KubernetesScenario) -> GatewayState:
    """Deploy active and stale tenant resources plus their initial gateway routes."""

    # Build the shared runtime configuration.
    runtime_envs = {
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": "database.internal",
        "LONGLINK_DATABASE_NAME": "organization-database",
        "LONGLINK_DATABASE_PASSWORD": "database-secret",
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SSLMODE": "require",
        "LONGLINK_DATABASE_USERNAME": "application-user",
        "LONGLINK_STORAGE_BUCKET": scenario.organization_id.hex,
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://sos-ch-gva-2.exo.io",
        "LONGLINK_STORAGE_PASSWORD": "storage-secret",
        "LONGLINK_STORAGE_REGION": "ch-gva-2",
        "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
        "LONGLINK_STORAGE_USERNAME": "storage-user",
    }

    # Install Organization and Application resources through their explicit lifecycles.
    await scenario.compute.organizations.apply("acme")
    await scenario.compute.organizations.apply("retired")
    await scenario.compute.applications.stage_envs(
        scenario.application_id,
        "acme",
        {"LONG_LINK_REQUIRED": "value", "PORT": "8000"},
    )
    await scenario.compute.applications.stage_runtime_envs(
        scenario.application_id,
        "acme",
        {
            **runtime_envs,
            "LONGLINK_DATABASE_SCHEMA": scenario.application_id.hex,
            "LONGLINK_STORAGE_PREFIX": f"applications/{scenario.application_id.hex}/",
        },
    )
    await scenario.compute.applications.stage_envs(scenario.stale_application_id, "acme", {"PORT": "8000"})
    await scenario.compute.applications.stage_runtime_envs(
        scenario.stale_application_id,
        "acme",
        {
            **runtime_envs,
            "LONGLINK_DATABASE_SCHEMA": scenario.stale_application_id.hex,
            "LONGLINK_STORAGE_PREFIX": f"applications/{scenario.stale_application_id.hex}/",
        },
    )
    await scenario.compute.applications.apply(scenario.application_id, "acme", ECHO_SERVER_IMAGE)
    await scenario.compute.applications.apply(scenario.stale_application_id, "acme", ECHO_SERVER_IMAGE)

    # Replace user-owned values before the next explicit workload apply.
    await scenario.compute.applications.stage_envs(
        scenario.application_id,
        "acme",
        {"LONG_LINK_REQUIRED": "updated", "PORT": "8000"},
    )
    await scenario.compute.applications.apply(scenario.application_id, "acme", ECHO_SERVER_IMAGE)

    # Reconcile both gateway routes and retain the generated TLS identity for later phases.
    routes = (
        GatewayRoute(id=scenario.application_id, namespace="acme"),
        GatewayRoute(id=scenario.stale_application_id, namespace="acme"),
    )
    result = await apply_gateway(scenario.compute, scenario.compute_id, routes)
    assert result.ip == ipaddress.ip_address(K3S_HOST)
    return result


async def drift_scenario(scenario: KubernetesScenario) -> None:
    """Introduce gateway and Application drift before lifecycle reconciliation."""

    # Replace the gateway configuration with invalid desired data.
    config_map = ConfigMap(
        {
            "apiVersion": "v1",
            "kind": "ConfigMap",
            "metadata": {
                "name": "longlink-gateway",
                "namespace": "longlink-system",
            },
            "data": {"envoy.yaml": "drift"},
        },
        api=await scenario.compute.api(),
    )
    await config_map.patch(config_map.raw)

    # Replace the retained Application Secret without resynchronizing its lifecycle.
    secret = Secret(str(scenario.application_id), namespace="acme", api=await scenario.compute.api())
    if await secret.exists():
        await secret.delete()
    await Secret(
        {
            "metadata": {"name": str(scenario.application_id), "namespace": "acme"},
            "stringData": {"STALE": "value"},
        },
        api=await scenario.compute.api(),
    ).create()


async def prune_scenario(
    scenario: KubernetesScenario,
    first: GatewayState,
) -> GatewayState:
    """Remove stale lifecycle targets and reconcile only the retained gateway route."""

    # Reconcile the current route graph without repairing the retained Application.
    routes = (GatewayRoute(id=scenario.application_id, namespace="acme"),)
    result = await apply_gateway(
        scenario.compute,
        scenario.compute_id,
        routes,
        first.tls,
    )
    await scenario.compute.applications.delete(scenario.stale_application_id, "acme")
    await scenario.compute.organizations.delete("retired")

    # Reconciliation must retain the compute's established TLS identity.
    assert result == first
    return result


async def assert_pruned_scenario(scenario: KubernetesScenario) -> None:
    """Verify gateway repair and explicit stale resource deletion."""

    # Wait for asynchronous Namespace and workload deletion to complete.
    deadline = time.monotonic() + 30
    while True:
        retired_namespace = await read_resource(scenario.compute, Namespace, "retired")
        stale_secret = await read_resource(scenario.compute, Secret, str(scenario.stale_application_id), "acme")
        stale_deployment = await read_resource(scenario.compute, Deployment, str(scenario.stale_application_id), "acme")
        stale_service = await read_resource(scenario.compute, Service, f"app-{scenario.stale_application_id}", "acme")
        retired_deleting = retired_namespace is None or retired_namespace.raw.get("metadata", {}).get("deletionTimestamp") is not None
        if (
            retired_deleting
            and stale_secret is None
            and stale_deployment is None
            and stale_service is None
        ):
            break
        if time.monotonic() >= deadline:
            pytest.fail(
                "k3s prune did not remove obsolete resources before timeout: "
                f"namespace={retired_namespace}, secret={stale_secret}, "
                f"deployment={stale_deployment}, service={stale_service}"
            )
        await asyncio.sleep(1)

    # Read the retained gateway and tenant resources after pruning settles.
    system_namespace = await read_resource(scenario.compute, Namespace, "longlink-system")
    organization_namespace = await read_resource(scenario.compute, Namespace, "acme")
    gateway_config_map = await read_resource(scenario.compute, ConfigMap, "longlink-gateway", "longlink-system")
    gateway_tls_secret = await read_resource(scenario.compute, Secret, "longlink-gateway-tls", "longlink-system")
    gateway_deployment = await read_resource(scenario.compute, Deployment, "longlink-gateway", "longlink-system")
    gateway_service = await read_resource(scenario.compute, Service, "longlink-gateway", "longlink-system")
    gateway_policy = await read_resource(scenario.compute, NetworkPolicy, "longlink-gateway-ingress", "longlink-system")
    organization_policy = await read_resource(scenario.compute, NetworkPolicy, "longlink-gateway-ingress", "acme")
    application_deployment = await read_resource(scenario.compute, Deployment, str(scenario.application_id), "acme")
    application_service = await read_resource(scenario.compute, Service, f"app-{scenario.application_id}", "acme")
    application_secret = await read_resource(scenario.compute, Secret, str(scenario.application_id), "acme")

    # Verify gateway drift repair and retained workload state.
    assert system_namespace is not None
    assert organization_namespace is not None
    assert gateway_config_map is not None
    gateway_config = gateway_config_map.data["envoy.yaml"]
    assert gateway_config != "drift"
    assert str(scenario.application_id) in gateway_config
    assert str(scenario.stale_application_id) not in gateway_config
    assert gateway_tls_secret is not None
    assert set(gateway_tls_secret.data) == {"ca.crt", "tls.crt", "tls.key"}
    assert gateway_deployment is not None
    assert gateway_deployment.spec.replicas == 1
    assert gateway_service is not None
    assert gateway_service.spec.type == "LoadBalancer"
    assert gateway_service.spec.ports[0].port == 443
    assert gateway_policy is not None
    assert gateway_policy.spec.podSelector.matchLabels == {"app": "longlink-gateway"}
    assert organization_policy is not None
    assert organization_policy.spec.podSelector == {}
    assert organization_policy.spec.ingress[0].ports[0].port == 8000
    assert application_deployment is not None
    assert application_service is not None
    assert application_service.spec.type == "ClusterIP"
    assert application_secret is not None
    assert set(application_secret.data) == {"STALE"}
    application_container = application_deployment.raw["spec"]["template"]["spec"]["containers"][0]
    assert application_container["envFrom"] == [{"secretRef": {"name": str(scenario.application_id)}}]

    # Tenant resources omit Platform revision annotations.
    tenant_resources = (
        organization_namespace,
        organization_policy,
        application_deployment,
        application_service,
        application_secret,
    )
    for resource in tenant_resources:
        annotations = resource.raw["metadata"].get("annotations", {})
        assert set(annotations).isdisjoint({"longlink.io/platform-version", "longlink.io/runtime-revision"})
    assert "annotations" not in application_deployment.raw["spec"]["template"]["metadata"]


async def assert_gateway_serves(scenario: KubernetesScenario, result: GatewayState) -> None:
    """Verify the retained Application through the CA-validated gateway and Pod logs."""

    # Ensure the retained Application workload is serving before exercising the public gateway.
    await scenario.compute.applications.apply(scenario.application_id, "acme", ECHO_SERVER_IMAGE)

    # Confirm a client without LongLink's certificate cannot complete the gateway TLS handshake.
    unauthenticated_tls = ssl.create_default_context(cadata=result.tls.ca_certificate)
    async with httpx2.AsyncClient(verify=unauthenticated_tls, timeout=30.0, trust_env=False) as client:
        with pytest.raises((httpx2.TransportError, ssl.SSLError)):
            await client.get(f"https://{K3S_HOST}:{scenario.gateway_port}/ready")

    # Call the gateway with LongLink's mTLS identity until the LoadBalancer path is available.
    tls = ssl.create_default_context(cadata=result.tls.ca_certificate)
    with TemporaryDirectory() as directory:
        certificate_path = Path(directory, "client.crt")
        private_key_path = Path(directory, "client.key")
        certificate_path.write_text(result.tls.certificate, encoding="ascii")
        private_key_path.write_text(result.tls.private_key, encoding="ascii")
        tls.load_cert_chain(certificate_path, private_key_path)
    async with httpx2.AsyncClient(verify=tls, timeout=30.0, trust_env=False) as client:
        deadline = time.monotonic() + 60
        while True:
            response = await client.get(f"https://{K3S_HOST}:{scenario.gateway_port}/ready")
            if response.status_code == 200:
                break
            if time.monotonic() >= deadline:
                pytest.fail(f"k3s gateway did not become reachable over HTTPS: {response.status_code} {response.text}")
            await asyncio.sleep(2)

    # Confirm Application log access still resolves the active Pod.
    logs = await scenario.compute.applications.logs(scenario.application_id, "acme", lines=50)
    assert any("Listening on port 8000." in line for line in logs)


async def cleanup_scenario(scenario: KubernetesScenario, tls: GatewayTLSMaterial) -> None:
    """Delete tenant and gateway resources and verify their terminal states."""

    # Remove all routes before deleting the tenant and dedicated compute resources.
    await apply_gateway(
        scenario.compute,
        scenario.compute_id,
        (),
        tls,
    )
    await scenario.compute.applications.delete(scenario.application_id, "acme")
    await scenario.compute.organizations.delete("acme")
    await delete_gateway_resources(scenario.compute)

    # Wait until all exact resources are absent or their Namespaces are terminating.
    deadline = time.monotonic() + 30
    while True:
        application_deployment = await read_resource(scenario.compute, Deployment, str(scenario.application_id), "acme")
        application_service = await read_resource(scenario.compute, Service, f"app-{scenario.application_id}", "acme")
        application_secret = await read_resource(scenario.compute, Secret, str(scenario.application_id), "acme")
        application_policy = await read_resource(scenario.compute, NetworkPolicy, "longlink-gateway-ingress", "acme")
        gateway_deployment = await read_resource(scenario.compute, Deployment, "longlink-gateway", "longlink-system")
        gateway_service = await read_resource(scenario.compute, Service, "longlink-gateway", "longlink-system")
        gateway_config_map = await read_resource(scenario.compute, ConfigMap, "longlink-gateway", "longlink-system")
        gateway_tls_secret = await read_resource(scenario.compute, Secret, "longlink-gateway-tls", "longlink-system")
        gateway_policy = await read_resource(scenario.compute, NetworkPolicy, "longlink-gateway-ingress", "longlink-system")
        organization_namespace = await read_resource(scenario.compute, Namespace, "acme")
        system_namespace = await read_resource(scenario.compute, Namespace, "longlink-system")
        organization_deleting = (
            organization_namespace is None or organization_namespace.raw.get("metadata", {}).get("deletionTimestamp") is not None
        )
        system_deleting = system_namespace is None or system_namespace.raw.get("metadata", {}).get("deletionTimestamp") is not None
        if (
            application_deployment is None
            and application_service is None
            and application_secret is None
            and application_policy is None
            and gateway_deployment is None
            and gateway_service is None
            and gateway_config_map is None
            and gateway_tls_secret is None
            and gateway_policy is None
            and organization_deleting
            and system_deleting
        ):
            return
        if time.monotonic() >= deadline:
            pytest.fail("k3s resources did not enter the deleted state before the cleanup timeout")
        await asyncio.sleep(1)


async def test_kubernetes_manages_real_namespace_application_gateway_and_cleanup(
    kubernetes_compute: tuple[Kubernetes, int],
) -> None:
    """Run the complete LongLink lifecycle through focused real-cluster phases."""

    # Define stable identities shared by every lifecycle phase.
    compute, gateway_port = kubernetes_compute
    scenario = KubernetesScenario(
        compute=compute,
        gateway_port=gateway_port,
        compute_id=UUID("00000000-0000-4000-8000-000000000001"),
        organization_id=UUID("10000000-0000-4000-8000-000000000001"),
        application_id=UUID("20000000-0000-4000-8000-000000000001"),
        stale_application_id=UUID("20000000-0000-4000-8000-000000000002"),
    )
    cleanup_completed = False

    try:
        async with asyncio.timeout(600):
            # Execute deploy, drift repair, pruning, serving, and cleanup as explicit phases.
            first = await deploy_scenario(scenario)
            await drift_scenario(scenario)
            second = await prune_scenario(scenario, first)
            await assert_pruned_scenario(scenario)
            await assert_gateway_serves(scenario, second)
            await cleanup_scenario(scenario, second.tls)
            cleanup_completed = True
    finally:
        # Keep the shared Docker daemon clean when a phase assertion interrupts reconciliation.
        if not cleanup_completed:
            await delete_gateway_resources(compute)
