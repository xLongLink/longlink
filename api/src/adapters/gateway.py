import ssl
import httpx2
from uuid import UUID
from dataclasses import dataclass
from collections.abc import AsyncIterator
from src.models.gateways import USER_ID_HEADER, APPLICATION_ID_HEADER, GATEWAY_SECRET_HEADER


class GatewayRequestError(Exception):
    """Report an HTTP transport failure while contacting a compute gateway."""


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

    def __init__(self, url: str, ca_certificate: str, secret: str) -> None:
        """Initialize one gateway connection from persisted compute state."""

        self._url = url.rstrip("/")
        self._ca_certificate = ca_certificate
        self._secret = secret

    async def request(
        self,
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
        url = f"{self._url}{f'/{path}' if path else '/'}"
        if query:
            url = f"{url}?{query}"
        headers = {
            GATEWAY_SECRET_HEADER: self._secret,
            APPLICATION_ID_HEADER: str(application_id),
            USER_ID_HEADER: str(user_id),
        }
        if content_type is not None:
            headers["content-type"] = content_type

        # Trust only the private CA created for this compute gateway.
        tls = ssl.create_default_context(cadata=self._ca_certificate)
        client = httpx2.AsyncClient(follow_redirects=False, timeout=300.0, verify=tls)
        try:
            request = client.build_request(method, url, content=content, headers=headers)
            response = await client.send(request, stream=True)
        except httpx2.HTTPError as exc:
            await client.aclose()
            raise GatewayRequestError from exc
        except Exception:
            await client.aclose()
            raise
        return GatewayResponse(client, response)
