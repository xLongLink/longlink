import ssl
import httpx2
from typing import override
from src.adapters import gateway


class Transport(httpx2.AsyncHTTPTransport):
    """Reach Kourier through loopback while preserving its configured TLS identity."""

    def __init__(self, port: int, certificate: str | None) -> None:
        """Bind one verified HTTP transport to an authenticated Kubernetes tunnel."""

        super().__init__(verify=ssl.create_default_context(cadata=certificate), trust_env=False)
        self._port = port

    @override
    async def handle_async_request(self, request: httpx2.Request) -> httpx2.Response:
        """Override the TCP destination without changing Knative's routing Host header."""

        # HTTP core's SNI extension preserves hostname verification independently of the loopback URL.
        request.extensions["sni_hostname"] = request.url.host
        request.url = request.url.copy_with(host="127.0.0.1", port=self._port)
        return await super().handle_async_request(request)


class Gateway(gateway.Gateway):
    """Use a request-owned tunnel only for the host-run development API."""

    def __init__(self, url: str, certificate: str | None, port: int) -> None:
        """Keep the tunnel alive through the caller's Kubernetes exit stack."""

        super().__init__(url, certificate)
        self._port = port

    @override
    def client(self) -> httpx2.AsyncClient:
        """Return a tunneled client for readiness checks or streaming proxy requests."""

        transport = Transport(self._port, self._certificate)
        return httpx2.AsyncClient(transport=transport, follow_redirects=False, trust_env=False, timeout=300.0)
