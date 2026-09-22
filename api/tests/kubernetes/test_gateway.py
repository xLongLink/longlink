import ssl
import yaml
import pytest
import subprocess
from types import SimpleNamespace
from pathlib import Path
from conftest import kubernetes_client
from src.kubernetes import gateway
from src.kubernetes.gateway import _deployment_is_ready

pytestmark = pytest.mark.no_db


READY_STATUS = {
    "observedGeneration": 3,
    "replicas": 2,
    "updatedReplicas": 2,
    "readyReplicas": 2,
    "availableReplicas": 2,
}


@pytest.mark.parametrize(
    ("generation", "replicas", "status", "expected"),
    [
        pytest.param(3, 2, READY_STATUS, True, id="current"),
        pytest.param(None, 2, READY_STATUS, False, id="missing-generation"),
        pytest.param(3, None, READY_STATUS, False, id="missing-replicas"),
        pytest.param(3, 2, READY_STATUS | {"observedGeneration": 2}, False, id="stale-generation"),
        pytest.param(3, 2, READY_STATUS | {"replicas": 1}, False, id="pending-replicas"),
        pytest.param(3, 2, READY_STATUS | {"updatedReplicas": 1}, False, id="stale-replicas"),
        pytest.param(3, 2, READY_STATUS | {"readyReplicas": 1}, False, id="unready-replicas"),
        pytest.param(3, 2, READY_STATUS | {"availableReplicas": 1}, False, id="unavailable-replicas"),
    ],
)
def test_deployment_is_ready_requires_current_replicas(
    generation: int | None,
    replicas: int | None,
    status: dict[str, int],
    expected: bool,
) -> None:
    """Require every requested replica to belong to the current Deployment generation."""

    # Arrange
    deployment = SimpleNamespace(
        metadata={"generation": generation},
        spec={"replicas": replicas},
        raw={"status": status},
    )

    # Assert
    assert _deployment_is_ready(deployment) is expected


@pytest.fixture
def observed_resources(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, str]]:
    """Expose read-only Kubernetes and HTTP boundaries to the real verifier."""

    observed: list[tuple[str, str]] = []

    class Resource:
        """Provide current package, Secret, and Deployment observations without mutation methods."""

        def __init__(self, name: str, namespace: str, api: object) -> None:
            """Record the resource selected by the verifier."""

            observed.append((namespace, name))
            self.raw = {
                "data": {"contract": "1", "platform_version": "v0.0.0", "tls.crt": "certificate", "tls.key": "key"},
                "spec": {"replicas": 1},
                "status": {"observedGeneration": 1, "replicas": 1, "updatedReplicas": 1, "readyReplicas": 1, "availableReplicas": 1},
            }
            self.metadata = {"generation": 1}
            self.spec = {"replicas": 1}

        async def refresh(self) -> None:
            """Return the current observation."""

    class Client:
        """Validate the transport settings and return a gateway readiness response."""

        def __init__(self, **kwargs: object) -> None:
            """Require isolated HTTP configuration and certificate validation."""

            assert kwargs["trust_env"] is False
            assert kwargs["follow_redirects"] is False
            context = kwargs["verify"]
            assert isinstance(context, ssl.SSLContext)
            assert context.verify_mode == ssl.CERT_REQUIRED

        async def __aenter__(self) -> "Client":
            """Enter the HTTP lifetime."""

            return self

        async def __aexit__(self, *args: object) -> None:
            """Close the HTTP lifetime."""

        async def get(self, url: str, headers: dict[str, str]) -> gateway.httpx2.Response:
            """Preserve endpoint TLS authority and Kourier's readiness vhost."""

            assert url == "https://gateway.example/ready"
            assert headers == {"Host": "internalkourier"}
            return gateway.httpx2.Response(200)

    monkeypatch.setattr(gateway, "ConfigMap", Resource)
    monkeypatch.setattr(gateway, "Deployment", Resource)
    monkeypatch.setattr(gateway.httpx2, "AsyncClient", Client)
    return observed


async def test_gateway_verifies_installed_controllers(observed_resources: list[tuple[str, str]]) -> None:
    """Observe installed controllers and verify HTTPS without any Kubernetes writes."""

    # Exercise the actual verifier against boundaries that expose no mutation methods.
    await gateway.verify(kubernetes_client(), "https://gateway.example")
    assert ("longlink-system", "compute-release") in observed_resources
    assert ("cnpg-system", "cnpg-controller-manager") in observed_resources


@pytest.mark.parametrize(
    "gateway_url",
    [
        pytest.param("http://gateway.example", id="http-scheme"),
        pytest.param("https://user@gateway.example", id="username"),
        pytest.param("https://:secret@gateway.example", id="password"),
        pytest.param("https://gateway.example/ready", id="path"),
        pytest.param("https://gateway.example?next=1", id="query"),
        pytest.param("https://gateway.example#ready", id="fragment"),
    ],
)
async def test_gateway_rejects_non_origin_url(gateway_url: str, observed_resources: list[tuple[str, str]]) -> None:
    """Reject Compute gateway endpoints that are not bare HTTPS origins."""

    # Arrange
    _ = observed_resources

    # Act and assert
    with pytest.raises(ValueError, match="Gateway endpoint must be an HTTPS origin"):
        await gateway.verify(kubernetes_client(), gateway_url)


async def test_gateway_propagates_controller_lookup_errors(
    monkeypatch: pytest.MonkeyPatch, observed_resources: list[tuple[str, str]]
) -> None:
    """Preserve unexpected Kubernetes observation errors."""

    # Fail at the Deployment boundary after reading release metadata and TLS configuration.
    def deployment(*args: object, **kwargs: object) -> None:
        """Report the Kubernetes lookup error."""

        raise LookupError("controller unavailable")

    monkeypatch.setattr(gateway, "Deployment", deployment)
    with pytest.raises(LookupError, match="controller unavailable"):
        await gateway.verify(kubernetes_client(), "https://gateway.example")


async def test_gateway_translates_readiness_timeout(monkeypatch: pytest.MonkeyPatch, observed_resources: list[tuple[str, str]]) -> None:
    """Expose readiness deadline failures without attempting an infrastructure repair."""

    # Expire the current-rollout lookup inside the verifier's deadline.
    def deployment(*args: object, **kwargs: object) -> None:
        """Report the expired deadline."""

        raise TimeoutError

    monkeypatch.setattr(gateway, "Deployment", deployment)
    with pytest.raises(RuntimeError, match="Shared controllers or verified Kourier endpoint did not become ready"):
        await gateway.verify(kubernetes_client(), "https://gateway.example")


async def test_gateway_accepts_version_skew(monkeypatch: pytest.MonkeyPatch, observed_resources: list[tuple[str, str]]) -> None:
    """Accept version-skewed Compute packages without failing validation."""

    # Exercise the contract gate against a Compute package newer than the Platform.
    _ = observed_resources

    class SkewedRelease:
        """Expose a supported contract with a skewed package version."""

        def __init__(self, name: str, namespace: str, api: object) -> None:
            """Ignore the selected release coordinates."""

        async def refresh(self) -> None:
            """Return the current observation."""

        raw = {"data": {"contract": "1", "platform_version": "v9.9.9"}}

    monkeypatch.setattr(gateway, "ConfigMap", SkewedRelease)
    await gateway.verify(kubernetes_client(), "https://gateway.example")


async def test_gateway_rejects_contract_mismatch(monkeypatch: pytest.MonkeyPatch, observed_resources: list[tuple[str, str]]) -> None:
    """Reject Compute packages on an unsupported release contract."""

    # Exercise the contract gate against an incompatible Compute package.
    _ = observed_resources

    class ForeignRelease:
        """Expose an unsupported release contract."""

        def __init__(self, name: str, namespace: str, api: object) -> None:
            """Ignore the selected release coordinates."""

        async def refresh(self) -> None:
            """Return the current observation."""

        raw = {"data": {"contract": "2", "platform_version": "v9.9.9"}}

    monkeypatch.setattr(gateway, "ConfigMap", ForeignRelease)
    with pytest.raises(ValueError, match="Compute package is incompatible"):
        await gateway.verify(kubernetes_client(), "https://gateway.example")


async def test_read_package_version_returns_observed_version(observed_resources: list[tuple[str, str]]) -> None:
    """Report the installed Compute package version without checking readiness."""

    # Exercise the overview read against the installed release metadata.
    _ = observed_resources
    assert await gateway.read_package_version(kubernetes_client()) == "v0.0.0"


async def test_read_package_version_omits_missing_version(
    monkeypatch: pytest.MonkeyPatch, observed_resources: list[tuple[str, str]]
) -> None:
    """Omit the overview version when the release reports no package version."""

    # Exercise the overview read against release metadata without a version.
    _ = observed_resources

    class UnversionedRelease:
        """Expose a supported contract without a package version."""

        def __init__(self, name: str, namespace: str, api: object) -> None:
            """Ignore the selected release coordinates."""

        async def refresh(self) -> None:
            """Return the current observation."""

        raw = {"data": {"contract": "1"}}

    monkeypatch.setattr(gateway, "ConfigMap", UnversionedRelease)
    assert await gateway.read_package_version(kubernetes_client()) is None


async def test_read_package_version_propagates_lookup_errors(
    monkeypatch: pytest.MonkeyPatch, observed_resources: list[tuple[str, str]]
) -> None:
    """Preserve Kubernetes observation errors for the fan-out fallback."""

    # Fail at the release boundary; the list endpoint maps this to a missing version.
    _ = observed_resources

    def release(*args: object, **kwargs: object) -> None:
        """Report the Kubernetes lookup error."""

        raise LookupError("release unavailable")

    monkeypatch.setattr(gateway, "ConfigMap", release)
    with pytest.raises(LookupError, match="release unavailable"):
        await gateway.read_package_version(kubernetes_client())


def test_compute_package_keeps_gateway_tls_and_ingress_boundaries() -> None:
    """Validate the actual external package's network boundary and TLS-only listener."""

    # Render the production chart rather than reproducing its fixed-IP resources.
    chart = Path(__file__).resolve().parents[3] / "k8s/chart"
    release = subprocess.run(
        [
            "helm",
            "template",
            "longlink-compute",
            str(chart),
            "--namespace",
            "longlink-system",
            "--set",
            "gateway.address=203.0.113.10",
            "--set",
            "storage.address=203.0.113.11",
            "--set",
            "gatewayAllowedSourceCidr=203.0.113.0/24",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    documents = list(yaml.safe_load_all(release.stdout))
    policies = {document["metadata"]["name"]: document for document in documents if document and document["kind"] == "NetworkPolicy"}
    assert "longlink-runtime-gateway" not in policies
    assert policies["longlink-gateway-boundary"]["spec"]["ingress"][1]["from"] == [
        {
            "namespaceSelector": {"matchLabels": {"longlink.io/platform": "true"}},
            "podSelector": {"matchLabels": {"longlink.io/component": "api"}},
        }
    ]
    service = next(document for document in documents if document["kind"] == "Service" and document["metadata"]["name"] == "kourier")
    assert service["spec"]["ports"] == [{"name": "https", "port": 443, "targetPort": 8444, "protocol": "TCP"}]
    assert service["spec"]["loadBalancerIP"] == "203.0.113.10"
    assert any(document["kind"] == "Secret" and document["metadata"]["name"] == "longlink-gateway-tls" for document in documents)
