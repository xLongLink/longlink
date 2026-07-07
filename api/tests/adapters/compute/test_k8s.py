import asyncio
import base64
import time
import pytest
from collections.abc import Iterator
from docker.errors import DockerException
from testcontainers.k3s import K3SContainer
from src.adapters.compute.k8s import K8s

pytestmark = pytest.mark.no_db
K3S_IMAGE = "rancher/k3s:v1.31.5-k3s1"
ECHO_SERVER_IMAGE = "ealen/echo-server:0.9.2"


@pytest.fixture
def k8s_compute() -> Iterator[K8s]:
    """Start a k3s container and return a Kubernetes compute adapter connected to it."""

    # Avoid binding host cgroups so nested pod sandboxes start reliably under Docker.
    container = K3SContainer(K3S_IMAGE, enable_cgroup_mount=False)
    try:
        container.start()
    except DockerException as exc:
        pytest.skip(f"Docker/k3s is not available for Kubernetes integration tests: {exc}")

    try:
        yield K8s(container.config_yaml(), "shared-secret", "apps.example.test")
    finally:
        container.stop()


@pytest.mark.integration
async def test_k8s_adapter_manages_real_namespace_application_gateway_and_cleanup(k8s_compute: K8s) -> None:
    """Exercise the Kubernetes adapter against a real k3s cluster."""

    adapter = k8s_compute

    try:
        await adapter.namespace("acme")
        await adapter.namespace("acme")
        application_id = "00000000-0000-4000-8000-000000000001"
        route = await adapter.application(
            "acme",
            "dashboard",
            application_id,
            ECHO_SERVER_IMAGE,
            80,
            {"LONG_LINK_REQUIRED": "value"},
            rollout_token="integration-test",
        )

        # Wait for the image pull, deployment scheduling, and readiness probe-free startup to finish.
        deadline = time.monotonic() + 180
        ready_pod_names: list[str] = []
        while time.monotonic() < deadline:
            pods = adapter.application_pods("acme", "dashboard")
            ready_pod_names = [
                pod.metadata.name
                for pod in pods
                if pod.metadata is not None
                and pod.metadata.name is not None
                and pod.status is not None
                and pod.status.phase == "Running"
                and any(
                    condition.type == "Ready" and condition.status == "True"
                    for condition in pod.status.conditions or []
                )
            ]
            if ready_pod_names:
                break
            await asyncio.sleep(2)
        else:
            pod_statuses = [
                {
                    "name": pod.metadata.name if pod.metadata else None,
                    "phase": pod.status.phase if pod.status else None,
                    "container_statuses": pod.status.container_statuses if pod.status else None,
                }
                for pod in adapter.application_pods("acme", "dashboard")
            ]
            pytest.fail(f"k3s application pod did not become ready before timeout: {pod_statuses}")

        gateway_config = adapter._core_api.read_namespaced_config_map(
            "longlink-gateway",
            "longlink-system",
        ).data["envoy.yaml"]
        gateway_secret = adapter._core_api.read_namespaced_secret(
            "longlink-gateway-auth",
            "longlink-system",
        )
        gateway_service = adapter._core_api.read_namespaced_service(
            "longlink-gateway",
            "longlink-system",
        )
        gateway_policy = adapter._networking_api.read_namespaced_network_policy(
            "longlink-gateway-ingress",
            "longlink-system",
        )
        gateway_ingress = adapter._networking_api.read_namespaced_ingress(
            "longlink-gateway",
            "longlink-system",
        )
        logs = await adapter.logs("acme", "dashboard", lines=50)
        namespaces = await adapter.namespaces()
        cluster_resources = await adapter.resources()
        namespace_pods = await adapter.pods("longlink-acme")

        assert route == "/longlink-acme/dashboard/"
        assert "longlink-acme" in namespaces
        assert f"/api/applications/{application_id}/proxy/" in gateway_config
        assert "dashboard.longlink-acme.svc.cluster.local" in gateway_config
        assert "shared-secret" not in gateway_config
        assert "__LONG_LINK_GATEWAY_SECRET__" in gateway_config
        assert base64.b64decode(gateway_secret.data["gateway-secret"]).decode("utf-8") == "shared-secret"
        assert gateway_service.spec.type == "ClusterIP"
        assert gateway_ingress.spec.rules[0].http.paths[0].backend.service.name == "longlink-gateway"
        assert gateway_policy.spec.pod_selector.match_labels == {"app": "longlink-gateway"}
        assert isinstance(logs, str)
        assert cluster_resources["ram_total"] > 0
        assert cluster_resources["cpu_total"] > 0
        application_pod = next((pod for pod in namespace_pods if pod["name"] in ready_pod_names), None)
        assert application_pod is not None
        assert application_pod["status"] == "Running"
        application_pod_resources = application_pod["resources"]
        assert application_pod_resources["cpu_limit"] == 0.5
        assert application_pod_resources["ram_limit"] == 256 * 1024 * 1024
        assert application_pod_resources["cpu_usage"] >= 0.0
        assert application_pod_resources["ram_usage"] >= 0
    finally:
        await adapter.delete_application("acme", "dashboard")
        await adapter.delete_namespace("acme")
