import yaml
import httpx2
import pytest
import subprocess
from uuid import uuid4
from types import SimpleNamespace
from pathlib import Path
from src.kubernetes import storage

pytestmark = pytest.mark.no_db


async def test_storage_administration_uses_cluster_tunnel(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sign admin requests for the loopback tunnel, not the public S3 endpoint."""

    # Supply a real RustFS HTTP client with only its network transport replaced.
    requests: list[httpx2.Request] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Observe the destination and signed admin request at the HTTP boundary."""

        requests.append(request)
        return httpx2.Response(200, json={})

    transport = httpx2.MockTransport(respond)
    client = httpx2.AsyncClient

    def local_client(**kwargs: object) -> httpx2.AsyncClient:
        """Keep real request construction and signature verification observable."""

        return client(transport=transport, **kwargs)

    class Cluster:
        """Supply the local port already forwarded by Kubernetes."""

        async def forward_storage(self) -> int:
            """Return the private administration port."""

            return 19000

    monkeypatch.setattr(storage.rustfs.httpx2, "AsyncClient", local_client)
    compute = SimpleNamespace(
        storage_endpoint="https://public-storage.example",
        storage_access_key="controller",
        storage_secret_key="secret",
        storage_certificate=None,
    )
    target = storage.Storage(compute, Cluster())  # type: ignore[arg-type]

    # A legitimate controller operation succeeds without sending admin traffic to the public endpoint.
    solution = uuid4()
    credentials = await target.service_account(uuid4(), solution)

    assert credentials.access_key == f"solution-{solution.hex}"
    assert len(requests) == 1
    assert requests[0].url == "http://127.0.0.1:19000/rustfs/admin/v3/add-service-account"
    assert requests[0].headers["Authorization"].startswith("AWS4-HMAC-SHA256 Credential=controller/")


async def test_storage_administration_requires_cluster() -> None:
    """Never fall back to the public endpoint when the tunnel is unavailable."""

    # A standalone Storage instance may still serve S3 usage, but not administrator requests.
    compute = SimpleNamespace(
        storage_endpoint="https://public-storage.example",
        storage_access_key="controller",
        storage_secret_key="secret",
        storage_certificate=None,
    )
    target = storage.Storage(compute)  # type: ignore[arg-type]

    with pytest.raises(RuntimeError, match="requires a Kubernetes connection"):
        await target.revoke(uuid4())


@pytest.mark.parametrize("status", [200, 503], ids=["ready", "unavailable"])
async def test_storage_registration_checks_remote_tunnel(monkeypatch: pytest.MonkeyPatch, status: int) -> None:
    """Exercise the tunneled HTTP connection before accepting a Compute."""

    # kr8s opens its remote connection only after the first local HTTP request.
    requests: list[httpx2.Request] = []

    def respond(request: httpx2.Request) -> httpx2.Response:
        """Return the RustFS readiness response over the substituted transport."""

        requests.append(request)
        return httpx2.Response(status)

    client = httpx2.AsyncClient
    transport = httpx2.MockTransport(respond)

    def local_client(**kwargs: object) -> httpx2.AsyncClient:
        """Exercise real HTTP request handling without opening a cluster connection."""

        return client(transport=transport, **kwargs)

    class Cluster:
        """Supply the forwarded local port."""

        async def forward_storage(self) -> int:
            """Return the private administration port."""

            return 19000

    monkeypatch.setattr(storage.httpx2, "AsyncClient", local_client)
    compute = SimpleNamespace(
        storage_endpoint="https://public-storage.example",
        storage_access_key="controller",
        storage_secret_key="secret",
        storage_certificate=None,
    )
    target = storage.Storage(compute, Cluster())  # type: ignore[arg-type]

    if status == 200:
        await target.verify_admin()
    else:
        with pytest.raises(httpx2.HTTPStatusError):
            await target.verify_admin()
    assert [request.url for request in requests] == [httpx2.URL("http://127.0.0.1:19000/health/ready")]


@pytest.mark.parametrize("local", [False, True], ids=["production", "local"])
def test_storage_proxy_denies_admin_routes_but_keeps_s3(local: bool) -> None:
    """Render the deployed proxy with an admin deny before its S3 fallback."""

    # Check the chart output used in both production and local development.
    root = Path(__file__).resolve().parents[3]
    chart = root / "k8s" / "chart"
    values = ["--values", str(root / "dev" / "values.yaml")] if local else []
    rendered = subprocess.run(
        [
            "helm",
            "template",
            "longlink-compute",
            str(chart),
            "--set",
            "gateway.address=127.0.0.1",
            "--set",
            "storage.address=127.0.0.1",
            "--set",
            "gatewayAllowedSourceCidr=127.0.0.1/32",
            *values,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    resources = yaml.safe_load_all(rendered.stdout)
    config = next(
        item["data"]["default.conf"]
        for item in resources
        if item and item.get("kind") == "ConfigMap" and item["metadata"]["name"] == "longlink-storage-proxy"
    )

    assert "location ^~ /rustfs/admin {\n        return 404;" in config
    assert "location / {\n        proxy_pass http://rustfs-svc.rustfs.svc.cluster.local:9000;" in config
