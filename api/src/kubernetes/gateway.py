import ssl
import httpx2
import asyncio
from typing import TYPE_CHECKING
from urllib.parse import urlsplit
from src.environments import env
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

        # A release record is written only by the external installer after convergence.
        pending = ConfigMap("compute-deployment", namespace="longlink-system", api=api)
        if await pending.exists():
            raise ValueError("Compute deployment is incomplete; finish the external installation before starting Platform workers")
        release = ConfigMap("compute-release", namespace="longlink-system", api=api)
        await release.refresh()
        data = release.raw.get("data", {})
        if data.get("contract") != "1" or data.get("clusterUID") != await self._client.cluster_uid():
            raise ValueError("Compute package is incompatible or belongs to another cluster; run the Compute deployment workflow")
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
                    ("rook-ceph", "rook-ceph-operator"),
                ):
                    deployment = Deployment(name, namespace=namespace, api=api)
                    while True:
                        await deployment.refresh()
                        if deployment_is_ready(deployment):
                            break
                        await asyncio.sleep(5)

                # Preserve TLS SNI while addressing Kourier's internal readiness vhost.
                if env.DEVELOPMENT:
                    from src.development import gateway

                    port = await self._client.portforward("kourier", "kourier-system", 8444)
                    transport = gateway.Transport(port, gateway_certificate)
                    client = httpx2.AsyncClient(transport=transport, follow_redirects=False, trust_env=False, timeout=300.0)
                else:
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
