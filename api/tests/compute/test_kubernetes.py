import ssl
import time
import base64
import httpx2
import pytest
import asyncio
from uuid import UUID
from containers import DockerRuntimeContainer, require_docker_daemon, wait_for_container_log
from collections.abc import Iterator
from src.environments import env
from kr8s.asyncio.objects import Secret, Service, ConfigMap, Namespace, Deployment, NetworkPolicy
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredCompute, DesiredApplication, DesiredOrganization

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

    def start(self) -> K3SRuntimeContainer:
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

        exit_code, output = self.execute(["cat", "/etc/rancher/k3s/k3s.yaml"])
        if exit_code:
            raise RuntimeError(f"Failed reading k3s kubeconfig: {output}")

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


@pytest.mark.integration
async def test_kubernetes_manages_real_namespace_application_gateway_and_cleanup(
    kubernetes_compute: tuple[Kubernetes, int],
) -> None:
    """Reconcile, repair, prune, serve HTTPS, enforce ownership, and clean a real k3s compute target."""

    # Arrange
    compute, gateway_port = kubernetes_compute
    compute_id = UUID("00000000-0000-4000-8000-000000000001")
    other_compute_id = UUID("00000000-0000-4000-8000-000000000002")
    organization_id = UUID("10000000-0000-4000-8000-000000000001")
    retired_organization_id = UUID("10000000-0000-4000-8000-000000000002")
    application_id = UUID("20000000-0000-4000-8000-000000000001")
    stale_application_id = UUID("20000000-0000-4000-8000-000000000002")
    proxy_secret = "shared-secret"
    desired = DesiredCompute(
        id=compute_id,
        organizations=(
            DesiredOrganization(id=organization_id, slug="acme"),
            DesiredOrganization(id=retired_organization_id, slug="retired"),
        ),
        applications=(
            DesiredApplication(
                id=application_id,
                organization_id=organization_id,
                namespace="acme",
                image=ECHO_SERVER_IMAGE,
                envs={"LONG_LINK_REQUIRED": "value", "PORT": "8000"},
            ),
            DesiredApplication(
                id=stale_application_id,
                organization_id=organization_id,
                namespace="acme",
                image=ECHO_SERVER_IMAGE,
                envs={"PORT": "8000"},
            ),
        ),
    )
    cleanup = DesiredCompute(id=compute_id, organizations=(), applications=(), deleting=True)
    cleanup_requested = False

    try:
        # Act: apply the complete graph once, then introduce owned resource drift.
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
        await compute._resources.apply(
            {
                "apiVersion": "v1",
                "kind": "ConfigMap",
                "metadata": {"name": "longlink-gateway", "namespace": "longlink-system"},
                "data": {"envoy.yaml": "drift"},
            }
        )
        await compute._resources.replace_secret(
            {
                "apiVersion": "v1",
                "kind": "Secret",
                "metadata": {"name": str(application_id), "namespace": "acme"},
                "type": "Opaque",
                "stringData": {"STALE": "value"},
            }
        )

        # Act: reconcile a reduced graph with persisted TLS to repair drift and prune obsolete state.
        current = DesiredCompute(
            id=compute_id,
            organizations=(DesiredOrganization(id=organization_id, slug="acme"),),
            applications=(
                DesiredApplication(
                    id=application_id,
                    organization_id=organization_id,
                    namespace="acme",
                    image=ECHO_SERVER_IMAGE,
                    envs={"LONG_LINK_REQUIRED": "value", "PORT": "8000"},
                ),
            ),
        )
        second = await compute.reconcile(current, proxy_secret, tls_material)

        # Assert: reconciliation reused TLS, repaired exact state, and removed stale resources.
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
        assert system_namespace.labels["longlink.io/compute-id"] == str(compute_id)
        assert organization_namespace is not None
        assert organization_namespace.labels["longlink.io/organization-id"] == str(organization_id)
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
        assert base64.b64decode(gateway_tls_secret.data["ca.crt"]).decode("utf-8") == first.gateway_ca_certificate
        assert gateway_deployment is not None
        assert gateway_deployment.spec.replicas == 2
        assert gateway_service is not None
        assert gateway_service.spec.type == "LoadBalancer"
        assert gateway_service.spec.ports[0].port == 443
        assert gateway_policy is not None
        assert gateway_policy.spec.podSelector.matchLabels == {"app": "longlink-gateway"}
        assert organization_policy is not None
        assert application_deployment is not None
        assert application_service is not None
        assert application_secret is not None
        assert set(application_secret.data) == {"LONG_LINK_REQUIRED", "PORT"}
        assert stale_secret is None
        assert stale_deployment is None
        assert stale_service is None

        # Every retained LongLink resource identifies the Platform release that rendered it.
        retained_resources = (
            system_namespace,
            organization_namespace,
            gateway_config_map,
            gateway_auth_secret,
            gateway_tls_secret,
            gateway_deployment,
            gateway_service,
            gateway_policy,
            organization_policy,
            application_deployment,
            application_service,
            application_secret,
        )
        for resource in retained_resources:
            assert resource.raw["metadata"]["annotations"]["longlink.io/platform-version"] == env.VERSION
        for deployment in (gateway_deployment, application_deployment):
            assert deployment.raw["spec"]["template"]["metadata"]["annotations"]["longlink.io/platform-version"] == env.VERSION

        # Wait for the retained workload before exercising the CA-verified HTTPS gateway.
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            if await compute.applications.ready(str(application_id)):
                break
            await asyncio.sleep(2)
        else:
            pod = await compute.applications.pod(str(application_id))
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

        logs = await compute.applications.logs(str(application_id), lines=50)
        assert any("Listening on port 8000." in line for line in logs)

        # A cluster claimed by one compute target must reject another target before adoption.
        with pytest.raises(ValueError, match=f"not owned by compute {other_compute_id}"):
            await compute.reconcile(
                DesiredCompute(id=other_compute_id, organizations=(), applications=()),
                "other-secret",
            )

        # Deleting desired state prunes all owned children before releasing the system Namespace claim.
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
