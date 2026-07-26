import ssl
import time
import base64
import httpx2
import pytest
import asyncio
from uuid import UUID
from containers import DockerRuntimeContainer, require_docker_daemon, wait_for_container_log
from collections.abc import Iterator
from kr8s.asyncio.objects import Pod, Secret, Service, ConfigMap, Namespace, Deployment, NetworkPolicy
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredCompute, DesiredGatewayRoute
from src.kubernetes.applications import DesiredApplication

pytestmark = pytest.mark.no_db
K3S_IMAGE = "rancher/k3s:v1.31.5-k3s1"
ECHO_SERVER_IMAGE = "ealen/echo-server:0.9.2"
K3S_HOST = "127.0.0.1"
K3S_PORT = 6443
K3S_GATEWAY_PORT = 443


class K3SRuntimeContainer(DockerRuntimeContainer):
    """Run a k3s server container for Kubernetes integration tests."""

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
        yield Kubernetes(container.config_yaml()), container.port(K3S_GATEWAY_PORT)
    finally:
        container.stop()


async def test_kubernetes_namespaces_filters_system_namespaces() -> None:
    """Return only non-system namespaces from the resource boundary."""

    # Provide mixed tenant and system namespaces through a fake resource boundary.
    class NamespaceResource:
        """Minimal namespace resource for client delegation tests."""

        def __init__(self, name: str) -> None:
            """Store the namespace name."""

            self.name = name

    class Resources:
        """Record Kubernetes resource listing calls."""

        calls: list[tuple[object, str | None, dict[str, str] | None]]

        def __init__(self) -> None:
            """Initialize the call log."""

            self.calls = []

        async def list(
            self, resource_class: object, namespace: str | None = None, label_selector: dict[str, str] | None = None
        ) -> list[NamespaceResource]:
            """Return fake namespaces for the requested resource class."""

            self.calls.append((resource_class, namespace, label_selector))
            assert resource_class is Namespace
            return [
                NamespaceResource("acme"),
                NamespaceResource("kube-system"),
                NamespaceResource("longlink-system"),
                NamespaceResource("globex"),
            ]

    resources = Resources()
    client = Kubernetes("unused")
    client._resources = resources

    # Request the namespaces visible to Platform callers.
    namespaces = await client.namespaces()

    # Verify system namespaces are filtered from the delegated result.
    assert namespaces == ["acme", "globex"]
    assert resources.calls == [(Namespace, None, None)]


async def test_kubernetes_pods_delegates_to_namespace_listing() -> None:
    """List pods through the shared resource boundary for one namespace."""

    # Provide fake pods and record resource boundary calls.
    class Resources:
        """Return fake pods from the requested namespace."""

        calls: list[tuple[object, str | None, dict[str, str] | None]]

        def __init__(self) -> None:
            """Initialize fake pod data."""

            self.calls = []
            self.pods = [object(), object()]

        async def list(
            self, resource_class: object, namespace: str | None = None, label_selector: dict[str, str] | None = None
        ) -> list[object]:
            """Return fake pod resources."""

            self.calls.append((resource_class, namespace, label_selector))
            assert resource_class is Pod
            return self.pods

    resources = Resources()
    client = Kubernetes("unused")
    client._resources = resources

    # Request pods for one Organization namespace.
    pods = await client.pods("acme")

    # Verify pod listing delegates with the requested namespace.
    assert pods == resources.pods
    assert resources.calls == [(Pod, "acme", None)]


@pytest.mark.integration
async def test_kubernetes_manages_real_namespace_application_gateway_and_cleanup(
    kubernetes_compute: tuple[Kubernetes, int],
) -> None:
    """Reconcile, repair, prune, serve HTTPS, enforce ownership, and clean a real k3s compute target."""

    # Define active and stale resources for the real-cluster lifecycle.
    compute, gateway_port = kubernetes_compute
    compute_id = UUID("00000000-0000-4000-8000-000000000001")
    organization_id = UUID("10000000-0000-4000-8000-000000000001")
    application_id = UUID("20000000-0000-4000-8000-000000000001")
    stale_application_id = UUID("20000000-0000-4000-8000-000000000002")
    proxy_secret = "shared-secret"
    active_application = DesiredApplication(
        id=application_id,
        namespace="acme",
        image=ECHO_SERVER_IMAGE,
    )
    stale_application = DesiredApplication(
        id=stale_application_id,
        namespace="acme",
        image=ECHO_SERVER_IMAGE,
    )
    runtime_envs = {
        "LONGLINK_ENV": "production",
        "LONGLINK_DATABASE_HOST": "database.internal",
        "LONGLINK_DATABASE_NAME": "organization-database",
        "LONGLINK_DATABASE_PASSWORD": "database-secret",
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SSLMODE": "require",
        "LONGLINK_DATABASE_USERNAME": "application-user",
        "LONGLINK_STORAGE_BUCKET": organization_id.hex,
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://sos-ch-gva-2.exo.io",
        "LONGLINK_STORAGE_PASSWORD": "storage-secret",
        "LONGLINK_STORAGE_REGION": "ch-gva-2",
        "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
        "LONGLINK_STORAGE_USERNAME": "storage-user",
    }
    desired = DesiredCompute(
        id=compute_id,
        routes=(
            DesiredGatewayRoute(id=application_id, namespace="acme"),
            DesiredGatewayRoute(id=stale_application_id, namespace="acme"),
        ),
    )
    cleanup = DesiredCompute(id=compute_id, routes=(), deleting=True)
    cleanup_requested = False

    try:

        # Act: install explicit tenant resources once, then reconcile only the gateway route graph.
        await compute.organizations.apply("acme")
        await compute.organizations.apply("retired")
        await compute.applications.stage_envs(application_id, "acme", {"LONG_LINK_REQUIRED": "value", "PORT": "8000"})
        assert await compute.applications.read_envs(application_id, "acme") == {"LONG_LINK_REQUIRED": "value", "PORT": "8000"}
        await compute.applications.apply(
            active_application,
            envs={
                **runtime_envs,
                "LONG_LINK_REQUIRED": "value",
                "PORT": "8000",
                "LONGLINK_DATABASE_SCHEMA": active_application.id.hex,
                "LONGLINK_STORAGE_PREFIX": f"applications/{active_application.id.hex}/",
            },
        )
        assert await compute.applications.read_envs(application_id, "acme") == {"LONG_LINK_REQUIRED": "value", "PORT": "8000"}
        await compute.applications.stage_envs(stale_application_id, "acme", {"PORT": "8000"})
        await compute.applications.apply(
            stale_application,
            envs={
                **runtime_envs,
                "PORT": "8000",
                "LONGLINK_DATABASE_SCHEMA": stale_application.id.hex,
                "LONGLINK_STORAGE_PREFIX": f"applications/{stale_application.id.hex}/",
            },
        )
        await compute.applications.wait_ready(str(application_id), "acme")
        await compute.applications.wait_ready(str(stale_application_id), "acme")
        try:
            first = await compute.reconcile(desired, proxy_secret)
        except TimeoutError:
            pods = await compute.pods("longlink-system")
            pod_statuses = [{"name": pod.name, "status": pod.raw.get("status", {})} for pod in pods]
            pod_logs: dict[str, list[str]] = {}
            for pod in pods:
                pod_logs[pod.name] = [line async for line in pod.logs(container="longlink-gateway", tail_lines=50)]
                container_statuses = pod.raw.get("status", {}).get("containerStatuses", [])
                if any(status.get("restartCount", 0) > 0 for status in container_statuses):
                    pod_logs[f"{pod.name}-previous"] = [
                        line async for line in pod.logs(container="longlink-gateway", previous=True, tail_lines=50)
                    ]
            pytest.fail(f"gateway rollout timed out: statuses={pod_statuses}, logs={pod_logs}")
        assert first.gateway_url == f"https://{K3S_HOST}"
        assert first.gateway_ca_certificate is not None
        assert first.gateway_tls_certificate is not None
        assert first.gateway_tls_private_key is not None
        tls_material = GatewayTLSMaterial(
            ca_certificate=first.gateway_ca_certificate,
            certificate=first.gateway_tls_certificate,
            private_key=first.gateway_tls_private_key,
        )
        await compute._resources.apply_platform(
            {
                "apiVersion": "v1",
                "kind": "ConfigMap",
                "metadata": {
                    "name": "longlink-gateway",
                    "namespace": "longlink-system",
                    "labels": {
                        "app.kubernetes.io/managed-by": "longlink-platform",
                        "longlink.io/resource-scope": "platform",
                    },
                },
                "data": {"envoy.yaml": "drift"},
            }
        )
        await compute._resources.replace_application_secret(
            {
                "apiVersion": "v1",
                "kind": "Secret",
                "metadata": {
                    "name": str(application_id),
                    "namespace": "acme",
                },
                "type": "Opaque",
                "stringData": {"STALE": "value"},
            }
        )

        # Act: remove explicit lifecycle targets without resynchronizing the retained Application.
        current = DesiredCompute(id=compute_id, routes=(DesiredGatewayRoute(id=application_id, namespace="acme"),))
        second = await compute.reconcile(current, proxy_secret, tls_material)
        await compute.applications.delete(stale_application_id, "acme")
        await compute.organizations.delete("retired")

        # Assert: synchronization reused TLS and removed stale resources without repairing the live workload.
        assert second.gateway_url == first.gateway_url
        assert second.gateway_ca_certificate == first.gateway_ca_certificate
        assert second.gateway_tls_certificate == first.gateway_tls_certificate
        assert second.gateway_tls_private_key == first.gateway_tls_private_key
        system_namespace = await compute._resources.read(Namespace, "longlink-system")
        organization_namespace = await compute._resources.read(Namespace, "acme")
        retired_namespace = await compute._resources.read(Namespace, "retired")
        gateway_config_map = await compute._resources.read(ConfigMap, "longlink-gateway", "longlink-system")
        gateway_auth_secret = await compute._resources.read(Secret, "longlink-gateway-auth", "longlink-system")
        gateway_tls_secret = await compute._resources.read(Secret, "longlink-gateway-tls", "longlink-system")
        gateway_deployment = await compute._resources.read(Deployment, "longlink-gateway", "longlink-system")
        gateway_service = await compute._resources.read(Service, "longlink-gateway", "longlink-system")
        gateway_policy = await compute._resources.read(NetworkPolicy, "longlink-gateway-ingress", "longlink-system")
        organization_policy = await compute._resources.read(NetworkPolicy, "longlink-gateway-ingress", "acme")
        application_deployment = await compute._resources.read(Deployment, str(application_id), "acme")
        application_service = await compute._resources.read(Service, f"app-{application_id}", "acme")
        application_secret = await compute._resources.read(Secret, str(application_id), "acme")

        # Namespace and workload deletion are asynchronous after their conditional prune requests succeed.
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            retired_namespace = await compute._resources.read(Namespace, "retired")
            stale_secret = await compute._resources.read(Secret, str(stale_application_id), "acme")
            stale_deployment = await compute._resources.read(Deployment, str(stale_application_id), "acme")
            stale_service = await compute._resources.read(Service, f"app-{stale_application_id}", "acme")
            retired_deleting = retired_namespace is None or retired_namespace.raw.get("metadata", {}).get("deletionTimestamp") is not None
            if retired_deleting and stale_secret is None and stale_deployment is None and stale_service is None:
                break
            await asyncio.sleep(1)
        else:
            pytest.fail(
                "k3s prune did not remove obsolete resources before timeout: "
                f"namespace={retired_namespace}, secret={stale_secret}, deployment={stale_deployment}, service={stale_service}"
            )

        assert system_namespace is not None
        assert organization_namespace is not None
        assert retired_deleting
        assert gateway_config_map is not None
        gateway_config = gateway_config_map.data["envoy.yaml"]
        assert gateway_config != "drift"
        assert str(application_id) in gateway_config
        assert str(stale_application_id) not in gateway_config
        assert "x-longlink-gateway-secret" in gateway_config
        assert "__LONG_LINK_GATEWAY_SECRET__" in gateway_config
        assert proxy_secret not in gateway_config
        assert gateway_auth_secret is not None
        assert base64.b64decode(gateway_auth_secret.data["gateway-secret"]).decode("utf-8") == proxy_secret
        assert gateway_tls_secret is not None
        assert gateway_deployment is not None
        assert gateway_deployment.spec.replicas == 2
        assert gateway_service is not None
        assert gateway_service.spec.type == "LoadBalancer"
        assert gateway_service.spec.ports[0].port == 443
        assert gateway_policy is not None
        assert gateway_policy.spec.podSelector.matchLabels == {"app": "longlink-gateway"}
        assert organization_policy is not None
        assert organization_policy.spec.podSelector == {}
        assert application_deployment is not None
        assert application_service is not None
        assert application_secret is not None
        assert set(application_secret.data) == {"STALE"}
        assert stale_secret is None
        assert stale_deployment is None
        assert stale_service is None

        # Tenant resources carry ownership metadata without Platform revision annotations.
        tenant_resources = (
            organization_namespace,
            organization_policy,
            application_deployment,
            application_service,
            application_secret,
        )
        for resource in tenant_resources:
            annotations = resource.raw["metadata"].get("annotations", {})
            assert set(annotations).isdisjoint(
                {"longlink.io/platform-version", "longlink.io/runtime-revision", "longlink.io/template-revision"}
            )
        assert set(application_deployment.raw["spec"]["template"]["metadata"]["annotations"]) == {"longlink.io/secret-resource-version"}

        # Wait for the retained workload before exercising the CA-verified HTTPS gateway.
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            if await compute.applications.ready(str(application_id), "acme"):
                break
            await asyncio.sleep(2)
        else:
            pod = await compute.applications.pod(str(application_id), "acme")
            pod_status = pod.raw.get("status", {}) if pod is not None else None
            pytest.fail(f"k3s application did not become ready before timeout: {pod_status}")

        tls = ssl.create_default_context(cadata=second.gateway_ca_certificate)
        async with httpx2.AsyncClient(verify=tls, timeout=30.0, trust_env=False) as client:
            deadline = time.monotonic() + 60
            while time.monotonic() < deadline:
                response = await client.get(f"https://{K3S_HOST}:{gateway_port}/ready")
                if response.status_code == 200:
                    break
                await asyncio.sleep(2)
            else:
                pytest.fail(f"k3s gateway did not become reachable over HTTPS: {response.status_code} {response.text}")

        logs = await compute.applications.logs(str(application_id), "acme", lines=50)
        assert any("Listening on port 8000." in line for line in logs)

        # Explicit tenant cleanup precedes compute deletion, which owns only gateway and bootstrap resources.
        await compute.reconcile(DesiredCompute(id=compute_id, routes=()), proxy_secret, tls_material)
        await compute.applications.delete(application_id, "acme")
        await compute.organizations.delete("acme")
        deleted = await compute.reconcile(cleanup, proxy_secret, tls_material)
        cleanup_requested = True
        assert deleted.gateway_url is None
        assert deleted.gateway_ca_certificate is None
        assert deleted.gateway_tls_certificate is None
        assert deleted.gateway_tls_private_key is None
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            application_deployment = await compute._resources.read(Deployment, str(application_id), "acme")
            application_service = await compute._resources.read(Service, f"app-{application_id}", "acme")
            application_secret = await compute._resources.read(Secret, str(application_id), "acme")
            application_policy = await compute._resources.read(NetworkPolicy, "longlink-gateway-ingress", "acme")
            gateway_deployment = await compute._resources.read(Deployment, "longlink-gateway", "longlink-system")
            gateway_service = await compute._resources.read(Service, "longlink-gateway", "longlink-system")
            gateway_config_map = await compute._resources.read(ConfigMap, "longlink-gateway", "longlink-system")
            gateway_auth_secret = await compute._resources.read(Secret, "longlink-gateway-auth", "longlink-system")
            gateway_tls_secret = await compute._resources.read(Secret, "longlink-gateway-tls", "longlink-system")
            gateway_policy = await compute._resources.read(NetworkPolicy, "longlink-gateway-ingress", "longlink-system")
            organization_namespace = await compute._resources.read(Namespace, "acme")
            system_namespace = await compute._resources.read(Namespace, "longlink-system")
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
                and gateway_auth_secret is None
                and gateway_tls_secret is None
                and gateway_policy is None
                and organization_deleting
                and system_deleting
            ):
                break
            await asyncio.sleep(1)
        else:
            pytest.fail("k3s resources did not enter the deleted state before the cleanup timeout")
    finally:

        # Keep the shared Docker daemon clean when an assertion interrupts reconciliation.
        if not cleanup_requested:
            await compute.reconcile(cleanup, proxy_secret)
