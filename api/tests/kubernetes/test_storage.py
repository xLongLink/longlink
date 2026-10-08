import httpx2
import pytest
from uuid import uuid4
from types import SimpleNamespace
from contextlib import asynccontextmanager
from src.kubernetes import storage
from collections.abc import AsyncIterator

pytestmark = pytest.mark.no_db


@pytest.fixture
def storage_compute() -> SimpleNamespace:
    """Supply the same public S3 connection settings to each storage test."""

    return SimpleNamespace(
        storage_endpoint="https://public-storage.example",
        storage_access_key="controller",
        storage_secret_key="secret",
        storage_certificate=None,
    )


@pytest.fixture
def storage_cluster() -> object:
    """Supply a Kubernetes tunnel with a fixed local administration port."""

    class Cluster:
        """Expose the forwarded RustFS port without opening a cluster connection."""

        async def forward_storage(self) -> int:
            """Return the private administration port."""

            return 19000

    return Cluster()


async def test_storage_administration_uses_cluster_tunnel(
    monkeypatch: pytest.MonkeyPatch,
    storage_compute: SimpleNamespace,
    storage_cluster: object,
) -> None:
    """Sign admin requests for the loopback tunnel, not the public S3 endpoint."""

    # Supply the workflow-owned HTTP client with only its network transport replaced.
    requests: list[httpx2.Request] = []
    clients: list[httpx2.AsyncClient] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Observe the destination and signed admin request at the HTTP boundary."""

        requests.append(request)
        return httpx2.Response(200, json={})

    transport = httpx2.MockTransport(respond)
    client = httpx2.AsyncClient

    def local_client(**kwargs: object) -> httpx2.AsyncClient:
        """Observe workflow ownership without replacing request construction or signing."""

        # Preserve the administrator transport's proxy, timeout, and redirect configuration.
        assert kwargs["trust_env"] is False
        assert kwargs["timeout"] == 30
        assert kwargs["follow_redirects"] is False
        connection = client(
            transport=transport,
            **kwargs,
        )
        clients.append(connection)
        return connection

    monkeypatch.setattr(storage.httpx2, "AsyncClient", local_client)
    target = storage.Storage(storage_compute, storage_cluster)  # type: ignore[arg-type]

    # A legitimate controller operation succeeds without sending admin traffic to the public endpoint.
    solution = uuid4()
    credentials = await target.service_account(uuid4(), solution)

    assert credentials.access_key == f"solution-{solution.hex}"
    assert len(requests) == 1
    assert requests[0].url == "http://127.0.0.1:19000/rustfs/admin/v3/add-service-account"
    assert requests[0].headers["Authorization"].startswith("AWS4-HMAC-SHA256 Credential=controller/")
    assert len(clients) == 1
    assert clients[0].is_closed


@pytest.mark.parametrize("status", [200, 503], ids=["ready", "unavailable"])
async def test_storage_registration_checks_remote_tunnel(
    monkeypatch: pytest.MonkeyPatch,
    status: int,
    storage_compute: SimpleNamespace,
    storage_cluster: object,
) -> None:
    """Verify public S3 credentials before exercising the tunneled readiness connection."""

    # Replace only the S3 transport boundary, retaining the real connection and TLS configuration.
    observations: list[str] = []

    class Buckets:
        """Expose the read-only S3 credential check."""

        async def list_buckets(self) -> None:
            """Record successful public credential verification."""

            observations.append("credentials")

    class Session:
        """Observe the real S3 client's public endpoint and transport lifetime."""

        @asynccontextmanager
        async def create_client(self, service: str, **kwargs: object) -> AsyncIterator[Buckets]:
            """Require TLS verification and release the S3 client before readiness."""

            # Preserve public endpoint, credential, and TLS checks at the external boundary.
            assert service == "s3"
            assert kwargs["endpoint_url"] == storage_compute.storage_endpoint
            assert kwargs["aws_access_key_id"] == storage_compute.storage_access_key
            assert kwargs["aws_secret_access_key"] == storage_compute.storage_secret_key
            assert kwargs["verify"] is True
            try:
                yield Buckets()
            finally:
                observations.append("closed")

    monkeypatch.setattr(storage.s3.aiobotocore.session, "get_session", Session)

    # kr8s opens its remote connection only after the first local HTTP request.
    requests: list[httpx2.Request] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return the RustFS readiness response over the substituted transport."""

        assert observations == ["credentials", "closed"]
        requests.append(request)
        return httpx2.Response(status)

    client = httpx2.AsyncClient
    transport = httpx2.MockTransport(respond)

    def local_client(**kwargs: object) -> httpx2.AsyncClient:
        """Exercise real HTTP request handling without opening a cluster connection."""

        assert kwargs["trust_env"] is False
        assert kwargs["timeout"] == 5.0
        assert kwargs["follow_redirects"] is False
        return client(transport=transport, **kwargs)

    monkeypatch.setattr(storage.httpx2, "AsyncClient", local_client)
    target = storage.Storage(storage_compute, storage_cluster)  # type: ignore[arg-type]

    if status == 200:
        await target.verify()
    else:
        with pytest.raises(httpx2.HTTPStatusError):
            await target.verify()
    assert [request.url for request in requests] == [httpx2.URL("http://127.0.0.1:19000/health/ready")]


def test_storage_proxy_denies_admin_routes_but_keeps_s3(rendered_chart: list[dict]) -> None:
    """Render the hardened TLS proxy with an admin deny before its S3 fallback."""

    # Check the chart's fixed storage proxy configuration.
    resources = rendered_chart
    config = next(
        item["data"]["default.conf"]
        for item in resources
        if item and item.get("kind") == "ConfigMap" and item["metadata"]["name"] == "longlink-storage-proxy"
    )

    assert "location ^~ /rustfs/admin {\n        return 404;" in config
    assert "location / {\n        proxy_pass http://rustfs-svc.rustfs.svc.cluster.local:9000;" in config

    # Keep the pinned TLS endpoint unprivileged without changing the public Service port.
    deployment = next(
        item for item in resources if item and item.get("kind") == "Deployment" and item["metadata"]["name"] == "longlink-storage"
    )
    pod = deployment["spec"]["template"]["spec"]
    container = pod["containers"][0]
    assert "@sha256:" in container["image"]
    assert pod["automountServiceAccountToken"] is False
    assert pod["securityContext"]["runAsNonRoot"] is True
    assert pod["securityContext"]["runAsUser"] == 101
    assert pod["securityContext"]["seccompProfile"]["type"] == "RuntimeDefault"
    assert container["securityContext"]["allowPrivilegeEscalation"] is False
    assert container["securityContext"]["readOnlyRootFilesystem"] is True
    assert container["securityContext"]["capabilities"]["drop"] == ["ALL"]
    assert container["resources"]["requests"]
    assert container["resources"]["limits"]
    assert container["ports"] == [{"containerPort": 8443, "name": "https"}]
    assert "listen 8443 ssl;" in config
    service = next(item for item in resources if item and item.get("kind") == "Service" and item["metadata"]["name"] == "longlink-storage")
    assert service["spec"]["ports"][0]["port"] == 443
    assert service["spec"]["ports"][0]["targetPort"] == "https"
