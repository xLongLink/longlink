import ssl
import httpx2
from typing import override


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
