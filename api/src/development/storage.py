import socket
from typing import override
from aiohttp.abc import ResolveResult, AbstractResolver
from urllib.parse import urlsplit


class Resolver(AbstractResolver):
    """Resolve one S3 hostname to its operation-owned loopback tunnel."""

    def __init__(self, endpoint: str, port: int) -> None:
        """Limit this resolver to the registered endpoint."""

        # Validate the logical hostname before routing its requests to loopback.
        hostname = urlsplit(endpoint).hostname
        if hostname is None:
            raise ValueError("Storage endpoint requires a hostname")
        self._hostname = hostname
        self._port = port

    @override
    async def resolve(self, host: str, port: int = 0, family: int = socket.AF_INET) -> list[ResolveResult]:
        """Keep the URL, TLS server name, and SigV4 authority unchanged."""

        # Reject redirects outside the registered endpoint.
        if host != self._hostname:
            raise OSError("Development storage redirected to an unexpected host")
        return [
            {
                "hostname": host,
                "host": "127.0.0.1",
                "port": self._port,
                "family": socket.AF_INET,
                "proto": socket.IPPROTO_TCP,
                "flags": socket.AI_NUMERICHOST,
            }
        ]

    @override
    async def close(self) -> None:
        """Release no resources; this resolver owns no DNS transport."""
