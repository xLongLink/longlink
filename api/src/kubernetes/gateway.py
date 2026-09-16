import ssl
import httpx2
import asyncio
from typing import TYPE_CHECKING
from urllib.parse import urlsplit
from kr8s.asyncio.objects import Secret, ConfigMap, Deployment
from src.kubernetes.utils import deployment_is_ready

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


async def verify(client: "Kubernetes", gateway_url: str, gateway_certificate: str | None = None) -> None:
    """Inspect package compatibility and readiness without changing infrastructure."""

    # Validate trust before opening the operator-configured endpoint.
    endpoint = urlsplit(gateway_url)
    if (
        endpoint.scheme != "https"
        or not endpoint.hostname
        or endpoint.username is not None
        or endpoint.password is not None
        or endpoint.path not in {"", "/"}
        or endpoint.query
        or endpoint.fragment
    ):
        raise ValueError("Gateway endpoint must be an HTTPS origin")
    context = ssl.create_default_context(cadata=gateway_certificate)
    api = await client.api()

    # The deployment owner applies the release contract only after shared infrastructure.
    release = ConfigMap("compute-release", namespace="longlink-system", api=api)
    await release.refresh()
    data = release.raw.get("data", {})
    if data.get("contract") != "1":
        raise ValueError("Compute package is incompatible; deploy a supported Compute package")
    secret = Secret("longlink-gateway-tls", namespace="knative-serving", api=api)
    await secret.refresh()
    if not secret.raw.get("data", {}).get("tls.crt") or not secret.raw.get("data", {}).get("tls.key"):
        raise ValueError("knative-serving/longlink-gateway-tls requires tls.crt and tls.key")

    # Observe current rollouts; registration never repairs or upgrades these controllers.
    try:
        async with asyncio.timeout(300):
            for namespace, name in (
                ("knative-serving", "controller"),
                ("knative-serving", "webhook"),
                ("knative-serving", "net-kourier-controller"),
                ("kourier-system", "3scale-kourier-gateway"),
                ("cnpg-system", "cnpg-controller-manager"),
            ):
                deployment = Deployment(name, namespace=namespace, api=api)
                while True:
                    await deployment.refresh()
                    if deployment_is_ready(deployment):
                        break
                    await asyncio.sleep(5)

            # Preserve TLS SNI while addressing Kourier's internal readiness vhost.
            http_client = httpx2.AsyncClient(verify=context, trust_env=False, timeout=10, follow_redirects=False)
            async with http_client:
                while True:
                    try:
                        response = await http_client.get(f"{gateway_url.rstrip('/')}/ready", headers={"Host": "internalkourier"})
                    except httpx2.TransportError:
                        await asyncio.sleep(5)
                        continue
                    if response.status_code == 200:
                        return
                    await asyncio.sleep(5)
    except TimeoutError:
        raise RuntimeError("Shared controllers or verified Kourier endpoint did not become ready") from None


async def read_package_version(cluster: "Kubernetes") -> str | None:
    """Return the installed Compute package version without checking readiness."""

    # Overview reads must never fail the caller; unavailability surfaces as a missing version.
    release = ConfigMap("compute-release", namespace="longlink-system", api=await cluster.api())
    await release.refresh()
    version = release.raw.get("data", {}).get("platform_version")
    return version if isinstance(version, str) and version else None
