import socket
from typing import override
from aiohttp.abc import ResolveResult, AbstractResolver
from urllib.parse import urlsplit
from longlink.storage import tls
from aiobotocore.config import AioConfig
from src.adapters.storage import s3


class Resolver(AbstractResolver):
    """Resolve one S3 hostname to its operation-owned loopback tunnel."""

    def __init__(self, hostname: str, port: int) -> None:
        """Limit this resolver to the registered endpoint."""

        self._hostname = hostname
        self._port = port

    @override
    async def resolve(self, host: str, port: int = 0, family: int = socket.AF_INET) -> list[ResolveResult]:
        """Keep the URL, TLS server name, and SigV4 authority unchanged."""

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


class S3(s3.S3):
    """Use an authenticated Kubernetes tunnel for development S3 connections."""

    def __init__(self, endpoint: str, credentials: s3.Credentials, certificate: str | None, port: int) -> None:
        """Separate the TCP destination from the signed and verified endpoint identity."""

        super().__init__(endpoint, credentials, certificate)
        hostname = urlsplit(endpoint).hostname
        if hostname is None:
            raise ValueError("Storage endpoint requires a hostname")
        self._resolver = Resolver(hostname, port)

    @override
    def config(self) -> AioConfig:
        """Install the scoped resolver without changing process-wide DNS or TLS settings."""

        return AioConfig(
            s3={"addressing_style": "path"},
            connect_timeout=10,
            read_timeout=30,
            connector_args={"resolver": self._resolver},
            http_session_cls=tls.Session,
        )
