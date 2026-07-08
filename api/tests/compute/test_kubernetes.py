import time
import base64
import pytest
import asyncio
from typing import Any, cast
from src.compute import Kubernetes
from docker.errors import DockerException
from collections.abc import Iterator
from testcontainers.k3s import K3SContainer
from kr8s.asyncio.objects import Secret, Ingress, Service, ConfigMap, NetworkPolicy

pytestmark = pytest.mark.no_db
K3S_IMAGE = "rancher/k3s:v1.31.5-k3s1"
ECHO_SERVER_IMAGE = "ealen/echo-server:0.9.2"


@pytest.fixture
def kubernetes_compute() -> Iterator[Kubernetes]:
    """Start a k3s container and return a Kubernetes compute client connected to it."""

    # Avoid binding host cgroups so nested pod sandboxes start reliably under Docker.
    container = K3SContainer(K3S_IMAGE, enable_cgroup_mount=False)
    try:
        container.start()
    except DockerException as exc:
        pytest.skip(f"Docker/k3s is not available for Kubernetes integration tests: {exc}")

    try:
        yield Kubernetes(container.config_yaml(), "shared-secret", "apps.example.test")
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
        route = await compute.application(
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
            pods = await compute.application_pods("acme", "dashboard")
            ready_pod_names = [
                pod.name
                for pod in pods
                if pod.raw.get("status", {}).get("phase") == "Running"
                and any(
                    condition.get("type") == "Ready" and condition.get("status") == "True"
                    for condition in pod.raw.get("status", {}).get("conditions", [])
                )
            ]
            if ready_pod_names:
                break
            await asyncio.sleep(2)
        else:
            pod_statuses = [
                {
                    "name": pod.name,
                    "phase": pod.raw.get("status", {}).get("phase"),
                    "container_statuses": pod.raw.get("status", {}).get("containerStatuses"),
                }
                for pod in await compute.application_pods("acme", "dashboard")
            ]
            pytest.fail(f"k3s application pod did not become ready before timeout: {pod_statuses}")

        gateway_config = (await compute._read(ConfigMap, "longlink-gateway", "longlink-system")).data["envoy.yaml"]
        gateway_secret = await compute._read(Secret, "longlink-gateway-auth", "longlink-system")
        gateway_service = await compute._read(Service, "longlink-gateway", "longlink-system")
        gateway_policy = await compute._read(NetworkPolicy, "longlink-gateway-ingress", "longlink-system")
        gateway_ingress = await compute._read(Ingress, "longlink-gateway", "longlink-system")
        logs = await compute.logs("acme", "dashboard", lines=50)
        namespaces = await compute.namespaces()
        cluster_resources = await compute.resources()
        namespace_pods = await compute.pods("longlink-acme")

        assert route == "/longlink-acme/dashboard/"
        assert "longlink-acme" in namespaces
        assert f"/api/applications/{application_id}/proxy/" in gateway_config
        assert "dashboard.longlink-acme.svc.cluster.local" in gateway_config
        assert "shared-secret" not in gateway_config
        assert "__LONG_LINK_GATEWAY_SECRET__" in gateway_config
        assert base64.b64decode(gateway_secret.data["gateway-secret"]).decode("utf-8") == "shared-secret"
        assert gateway_service.spec.type == "ClusterIP"
        assert gateway_ingress.spec.rules[0].http.paths[0].backend.service.name == "longlink-gateway"
        assert gateway_policy.spec.podSelector.matchLabels == {"app": "longlink-gateway"}
        assert isinstance(logs, str)
        assert cluster_resources["ram_total"] > 0
        assert cluster_resources["cpu_total"] > 0
        application_pod = next((pod for pod in namespace_pods if pod["name"] in ready_pod_names), None)
        assert application_pod is not None
        assert application_pod["status"] == "Running"
        application_pod_resources = cast(dict[str, Any], application_pod["resources"])
        assert application_pod_resources["cpu_limit"] == 0.5
        assert application_pod_resources["ram_limit"] == 256 * 1024 * 1024
        assert application_pod_resources["cpu_usage"] >= 0.0
        assert application_pod_resources["ram_usage"] >= 0
    finally:
        await compute.delete_application("acme", "dashboard")
        await compute.delete_namespace("acme")
