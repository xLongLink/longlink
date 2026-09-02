import ssl
import httpx2
import tempfile
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


class GatewayClient:
    """Send authenticated Platform requests to one compute gateway."""

    def __init__(self, url: str, ca_certificate: str, client_identity: str, identity_secret: str) -> None:
        """Initialize one gateway connection from persisted compute state."""

        self._url = url.rstrip("/")
        self._ca_certificate = ca_certificate
        self._client_identity = client_identity
        self._identity_secret = identity_secret

    async def request(
        self,
        *,
        solution_id: UUID,
        user_id: UUID,
        method: str,
        path: str,
        query: str,
        content_type: str | None,
        content: AsyncIterator[bytes],
    ) -> GatewayResponse:
        """Start one streamed request through the authenticated solution route."""

        headers = {
            "x-longlink-solution-id": str(solution_id),
            "x-longlink-identity": identity.create_identity_token(user_id, self._identity_secret),
        }
        if content_type is not None:
            headers["content-type"] = content_type

        # Authenticate the Platform using its client identity and trust only this Gateway CA.
        tls = ssl.create_default_context(cadata=self._ca_certificate)
        with tempfile.NamedTemporaryFile(mode="w") as identity_file:
            identity_file.write(self._client_identity)
            identity_file.flush()
            tls.load_cert_chain(identity_file.name)
        client = httpx2.AsyncClient(
            follow_redirects=False,
            timeout=300.0,
            verify=tls,
        )
        try:
            response = await client.send(
                client.build_request(method, f"{self._url}/{path}{'?' + query if query else ''}", content=content, headers=headers),
                stream=True,
            )
        except BaseException:
            await client.aclose()
            raise
        return GatewayResponse(client, response)
