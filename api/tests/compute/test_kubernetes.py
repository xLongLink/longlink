import time
import base64
import pytest
import asyncio
from containers import DockerRuntimeContainer, wait_for_container_log
from docker.errors import DockerException
from collections.abc import Iterator
from kr8s.asyncio.objects import Secret, Ingress, Service, ConfigMap, NetworkPolicy
from src.kubernetes.client import Kubernetes

pytestmark = pytest.mark.no_db
K3S_IMAGE = "rancher/k3s:v1.31.5-k3s1"
ECHO_SERVER_IMAGE = "ealen/echo-server:0.9.2"
K3S_HOST = "127.0.0.1"
K3S_PORT = 6443
K3S_WEBHOOK_PORT = 8443


class K3SRuntimeContainer(DockerRuntimeContainer):
    """Run a k3s server container for Kubernetes integration tests."""

    def __init__(self, image: str) -> None:
        """Configure the k3s server container."""

        super().__init__(
            image,
            command=f"server --disable traefik --tls-san={K3S_HOST}",
            environment={"K3S_URL": f"https://{K3S_HOST}:{K3S_PORT}"},
            ports=[K3S_PORT, K3S_WEBHOOK_PORT],
            privileged=True,
            tmpfs={"/run": "", "/var/run": ""},
        )

    def start(self) -> K3SRuntimeContainer:
        """Start k3s and wait until the server reports readiness."""

        super().start()
        wait_for_container_log(self, "Node controller sync successful", 120)
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
def kubernetes_compute() -> Iterator[Kubernetes]:
    """Start a k3s container and return a Kubernetes compute client connected to it."""

    # Avoid binding host cgroups so nested pod sandboxes start reliably under Docker.
    container = K3SRuntimeContainer(K3S_IMAGE)
    try:
        container.start()
    except DockerException as exc:
        pytest.skip(f"Docker/k3s is not available for Kubernetes integration tests: {exc}")

    try:
        yield Kubernetes(container.config_yaml(), "shared-secret")
    finally:
        container.stop()


@pytest.mark.integration
async def test_kubernetes_manages_real_namespace_application_gateway_and_cleanup(
    kubernetes_compute: Kubernetes,
) -> None:
    """Exercise the Kubernetes compute client against a real k3s cluster."""

    compute = kubernetes_compute

    try:
        await compute.namespace("acme")
        await compute.namespace("acme")
        application_id = "00000000-0000-4000-8000-000000000001"
        route = await compute.create(
            "acme",
            application_id,
            ECHO_SERVER_IMAGE,
            {"LONG_LINK_REQUIRED": "value", "PORT": "8000"},
        )

        # Wait for the image pull, deployment scheduling, and readiness probe-free startup to finish.
        deadline = time.monotonic() + 180
        ready_pod_name: str | None = None
        while time.monotonic() < deadline:
            pod = await compute.pod(application_id)

            # The application pod is created asynchronously by the deployment controller.
            if pod is not None and pod.raw.get("status", {}).get("phase") == "Running" and any(
                condition.get("type") == "Ready" and condition.get("status") == "True"
                for condition in pod.raw.get("status", {}).get("conditions", [])
            ):
                ready_pod_name = pod.name

            if ready_pod_name is not None:
                break
            await asyncio.sleep(2)
        else:
            pod = await compute.pod(application_id)
            pod_statuses = [
                {
                    "name": pod.name,
                    "phase": pod.raw.get("status", {}).get("phase"),
                    "container_statuses": pod.raw.get("status", {}).get("containerStatuses"),
                }
            ] if pod is not None else []
            pytest.fail(f"k3s application pod did not become ready before timeout: {pod_statuses}")

        gateway_config = (await compute._read(ConfigMap, "longlink-gateway", "longlink-system")).data["envoy.yaml"]
        gateway_secret = await compute._read(Secret, "longlink-gateway-auth", "longlink-system")
        gateway_service = await compute._read(Service, "longlink-gateway", "longlink-system")
        gateway_policy = await compute._read(NetworkPolicy, "longlink-gateway-ingress", "longlink-system")
        gateway_ingress = await compute._read(Ingress, "longlink-gateway", "longlink-system")
        logs = await compute.logs(application_id, lines=50)
        namespaces = await compute.namespaces()
        namespace_pods = await compute.pods("acme")

        assert route == f"/acme/{application_id}/"
        assert "acme" in namespaces
        assert f"/api/applications/{application_id}/proxy/" not in gateway_config
        assert "x-longlink-application-id" in gateway_config
        assert application_id in gateway_config
        assert f"{application_id}.acme.svc.cluster.local" in gateway_config
        assert "shared-secret" not in gateway_config
        assert "__LONG_LINK_GATEWAY_SECRET__" in gateway_config
        assert base64.b64decode(gateway_secret.data["gateway-secret"]).decode("utf-8") == "shared-secret"
        assert gateway_service.spec.type == "ClusterIP"
        assert gateway_ingress.spec.rules[0].http.paths[0].backend.service.name == "longlink-gateway"
        assert gateway_policy.spec.podSelector.matchLabels == {"app": "longlink-gateway"}
        assert isinstance(logs, str)
        application_pod = next((pod for pod in namespace_pods if pod["name"] == ready_pod_name), None)
        assert application_pod is not None
        assert application_pod["status"] == "Running"
    finally:
        await compute.delete(application_id)
        await compute.delete_namespace("acme")
