import ssl
import httpx2
from uuid import UUID
from longlink import identity
from dataclasses import dataclass
from collections.abc import AsyncIterator


@dataclass(slots=True)
class GatewayResponse:
    """Keep one streamed gateway response and its owning HTTP client together."""

    client: httpx2.AsyncClient
    response: httpx2.Response

    async def aclose(self) -> None:
        """Close the streamed response and its HTTP client."""

        # Release both resources after response streaming ends or is interrupted.
        try:
            await self.response.aclose()
        finally:
            await self.client.aclose()


class Gateway:
    """Send authorized Platform requests through the IP-restricted Kourier gateway."""

    def __init__(self, url: str, certificate: str | None = None) -> None:
        """Initialize one gateway connection from persisted compute state."""

        self._url = url.rstrip("/")
        self._certificate = certificate

    def client(self) -> httpx2.AsyncClient:
        """Create the operation-owned, hostname-verified gateway transport."""

        tls = ssl.create_default_context(cadata=self._certificate)
        return httpx2.AsyncClient(follow_redirects=False, trust_env=False, timeout=300.0, verify=tls)

    async def request(
        self,
        *,
        solution_id: UUID,
        organization_id: UUID,
        user_id: UUID,
        identity_secret: str,
        method: str,
        path: str,
        query: str,
        content_type: str | None,
        content: AsyncIterator[bytes],
    ) -> GatewayResponse:
        """Start one streamed request through the authenticated solution route."""

        headers = {
            "host": f"solution-{solution_id}.longlink-compute-{organization_id.hex}.svc.cluster.local",
            "x-longlink-identity": identity.create_identity_token(user_id, identity_secret),
        }
        if content_type is not None:
            headers["content-type"] = content_type

        # Verify the gateway hostname independently of the Knative routing authority.
        client = self.client()
        try:
            response = await client.send(
                client.build_request(method, f"{self._url}/{path}{'?' + query if query else ''}", content=content, headers=headers),
                stream=True,
            )
        except BaseException:
            await client.aclose()
            raise
        return GatewayResponse(client, response)
