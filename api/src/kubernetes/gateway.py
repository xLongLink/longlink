import ssl
import httpx2
import asyncio
from typing import TYPE_CHECKING
from urllib.parse import urlsplit
from kr8s.asyncio.objects import Secret, ConfigMap, Deployment
from src.kubernetes.utils import deployment_is_ready

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


class Gateway:
    """Validate preinstalled controllers and the configured HTTPS gateway."""

    def __init__(self, client: "Kubernetes") -> None:
        """Share the Compute Kubernetes connection."""

        self._client = client

    async def verify(self, gateway_url: str, gateway_certificate: str | None = None) -> None:
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
        api = await self._client.api()

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
                client = httpx2.AsyncClient(verify=context, trust_env=False, timeout=10, follow_redirects=False)
                async with client:
                    while True:
                        try:
                            response = await client.get(f"{gateway_url.rstrip('/')}/ready", headers={"Host": "internalkourier"})
                        except httpx2.TransportError:
                            await asyncio.sleep(5)
                            continue
                        if response.status_code == 200:
                            return
                        await asyncio.sleep(5)
        except TimeoutError:
            raise RuntimeError("Shared controllers or verified Kourier endpoint did not become ready") from None
