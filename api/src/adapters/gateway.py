import ssl
import httpx2
from uuid import UUID
from dataclasses import dataclass
from collections.abc import AsyncIterator
from src.models.gateways import API_KEY_HEADER, USER_ID_HEADER, APPLICATION_ID_HEADER


@dataclass(slots=True)
class GatewayResponse:
    """Keep one streamed gateway response and its owning HTTP client together."""

    client: httpx2.AsyncClient
    response: httpx2.Response

    async def aclose(self) -> None:
        """Close the streamed response and its HTTP client."""

        # Release both resources after response streaming ends or is interrupted.
        await self.response.aclose()
        await self.client.aclose()


class GatewayClient:
    """Send authenticated Platform requests to one compute gateway."""

    def __init__(self, url: str, ca_certificate: str, api_key: str) -> None:
        """Initialize one gateway connection from persisted compute state."""

        self._url = url.rstrip("/")
        self._api_key = api_key
        self._ca_certificate = ca_certificate

    async def request(
        self,
        *,
        application_id: UUID,
        user_id: UUID,
        method: str,
        path: str,
        query: str,
        content_type: str | None,
        content: AsyncIterator[bytes],
    ) -> GatewayResponse:
        """Start one streamed request through the authenticated application route."""

        # Preserve the existing gateway path and query contract.
        url = f"{self._url}/{path}"
        if query:
            url = f"{url}?{query}"
        headers = {
            API_KEY_HEADER: self._api_key,
            APPLICATION_ID_HEADER: str(application_id),
            USER_ID_HEADER: str(user_id),
        }
        if content_type is not None:
            headers["content-type"] = content_type

        # Authenticate LongLink with the per-Compute API key and trust only this Gateway CA.
        tls = ssl.create_default_context(cadata=self._ca_certificate)
        client = httpx2.AsyncClient(follow_redirects=False, timeout=300.0, verify=tls)
        try:
            response = await client.send(
                client.build_request(method, url, content=content, headers=headers),
                stream=True,
            )
        except Exception:
            await client.aclose()
            raise
        return GatewayResponse(client, response)
