import ssl
import httpx2
import asyncio
from typing import TYPE_CHECKING
from kr8s.asyncio.objects import ConfigMap, Deployment

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


def _deployment_is_ready(deployment: Deployment) -> bool:
    """Return whether every replica belongs to the observed Deployment generation."""

    # Require the controller to observe this generation and make every desired replica available.
    generation = deployment.metadata.get("generation")
    replicas = deployment.spec.get("replicas", 1)
    status = deployment.raw.get("status")
    return (
        isinstance(generation, int)
        and isinstance(replicas, int)
        and isinstance(status, dict)
        and status.get("observedGeneration") == generation
        and status.get("replicas") == replicas
        and status.get("updatedReplicas") == replicas
        # Ready and available counts must match the current generation's rollout.
        and status.get("readyReplicas") == replicas
        and status.get("availableReplicas") == replicas
    )


async def verify(client: "Kubernetes", gateway_url: str, gateway_certificate: str | None = None) -> None:
    """Inspect package compatibility and readiness without changing infrastructure."""

    # Configure trust before opening the operator-configured endpoint.
    context = ssl.create_default_context(cadata=gateway_certificate)
    api = await client.api()

    # The deployment owner applies the release contract only after shared infrastructure.
    release = ConfigMap("compute-release", namespace="longlink-system", api=api)
    await release.refresh()
    data = release.raw.get("data", {})
    if data.get("contract") != "1":
        raise ValueError("Compute package is incompatible; deploy a supported Compute package")

    # Observe current rollouts under the caller's deadline; registration never repairs these controllers.
    for namespace, name in (
        ("knative-serving", "controller"),
        ("knative-serving", "webhook"),
        ("knative-serving", "net-kourier-controller"),
        ("kourier-system", "3scale-kourier-gateway"),
        ("cnpg-system", "cnpg-controller-manager"),
    ):
        deployment = Deployment(name, namespace=namespace, api=api)

        # Wait for each gateway deployment's observed rollout.
        while True:
            await deployment.refresh()
            if _deployment_is_ready(deployment):
                break
            await asyncio.sleep(5)

    # Preserve TLS SNI while addressing Kourier's internal readiness vhost.
    http_client = httpx2.AsyncClient(verify=context, trust_env=False, timeout=10, follow_redirects=False)
    async with http_client:
        while True:

            # Probe routing only after the deployment checks succeed.
            try:
                response = await http_client.get(f"{gateway_url.rstrip('/')}/ready", headers={"Host": "internalkourier"})

            # Transient connection failures remain retryable during readiness polling.
            except httpx2.TransportError:
                await asyncio.sleep(5)
                continue

            # Only a successful gateway probe completes readiness.
            if response.status_code == 200:
                return
            await asyncio.sleep(5)
