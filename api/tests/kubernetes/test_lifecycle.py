import ssl
import time
import httpx2
import pytest
import asyncio
from uuid import UUID
from pathlib import Path
from tempfile import TemporaryDirectory
from containers import DockerRuntimeContainer, require_docker_daemon, wait_for_container_log
from collections.abc import Iterator
from src.models.computes import kubeconfig_mapping
from kr8s.asyncio.objects import Namespace
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute, generate_gateway_tls

pytestmark = [pytest.mark.no_db, pytest.mark.integration]
K3S_IMAGE = "rancher/k3s:v1.31.5-k3s1"
ECHO_SERVER_IMAGE = "ealen/echo-server:0.9.2"
K3S_HOST = "127.0.0.1"
K3S_PORT = 6443
K3S_GATEWAY_PORT = 443


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


async def test_kubernetes_deploys_application_through_mtls_gateway(kubernetes_compute: tuple[Kubernetes, int]) -> None:
    """Deploy one Organization Application and remove it through namespace cascade deletion."""

    # Define stable workload and compute identities.
    compute, gateway_port = kubernetes_compute
    compute_id = UUID("00000000-0000-4000-8000-000000000001")
    application_id = UUID("20000000-0000-4000-8000-000000000001")
    api = await compute.api()

    try:
        # Apply the tenant boundary and complete Application configuration.
        await compute.organizations.apply("acme")
        await compute.applications.stage_envs(application_id, "acme", {"PORT": "8000"})
        await compute.applications.stage_runtime_envs(
            application_id,
            "acme",
            {
                "LONGLINK_DATABASE_HOST": "database.internal",
                "LONGLINK_DATABASE_NAME": "organization-database",
                "LONGLINK_DATABASE_PASSWORD": "database-secret",
                "LONGLINK_DATABASE_PORT": "5432",
                "LONGLINK_DATABASE_SCHEMA": application_id.hex,
                "LONGLINK_DATABASE_SSLMODE": "require",
                "LONGLINK_DATABASE_USERNAME": "application-user",
                "LONGLINK_STORAGE_BUCKET": "organization-bucket",
                "LONGLINK_STORAGE_ENDPOINT_URL": "https://sos-ch-gva-2.exo.io",
                "LONGLINK_STORAGE_PASSWORD": "storage-secret",
                "LONGLINK_STORAGE_PREFIX": f"applications/{application_id.hex}/",
                "LONGLINK_STORAGE_REGION": "ch-gva-2",
                "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
                "LONGLINK_STORAGE_USERNAME": "storage-user",
            },
        )
        await compute.applications.apply(application_id, "acme", ECHO_SERVER_IMAGE)

        # Publish the Application through the gateway using the compute's mTLS identity.
        gateway_ip = await compute.gateway.ip()
        tls = generate_gateway_tls(compute_id, gateway_ip)
        routes = (GatewayRoute(id=application_id, namespace="acme"),)
        await compute.gateway.apply(routes, tls)
        await compute.gateway.apply(routes, tls)

        # Connect through the public LoadBalancer using only the generated compute CA and client certificate.
        context = ssl.create_default_context(cadata=tls.ca_certificate)
        with TemporaryDirectory() as directory:
            certificate_path = Path(directory, "client.crt")
            private_key_path = Path(directory, "client.key")
            certificate_path.write_text(tls.certificate, encoding="ascii")
            private_key_path.write_text(tls.private_key, encoding="ascii")
            context.load_cert_chain(certificate_path, private_key_path)
        async with httpx2.AsyncClient(verify=context, timeout=30.0, trust_env=False) as client:
            deadline = time.monotonic() + 60
            while True:
                response = await client.get(f"https://{K3S_HOST}:{gateway_port}/ready")
                if response.status_code == 200:
                    break
                if time.monotonic() >= deadline:
                    pytest.fail(f"k3s gateway did not become reachable over HTTPS: {response.status_code} {response.text}")
                await asyncio.sleep(2)

        # Namespace deletion cascades workload cleanup before provider credentials are revoked.
        await compute.organizations.delete("acme")
        assert not await Namespace("acme", api=api).exists()
    finally:
        # Remove dedicated gateway resources when an assertion interrupts the smoke test.
        system_namespace = Namespace("longlink-system", api=api)
        if await system_namespace.exists():
            await system_namespace.delete()
