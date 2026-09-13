import ssl
import yaml
import pytest
import subprocess
from pathlib import Path
from conftest import FakeKubernetes
from src.kubernetes import gateway

pytestmark = pytest.mark.no_db


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
                "data": {"contract": "1", "tls.crt": "certificate", "tls.key": "key"},
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
    monkeypatch.setattr(gateway, "Secret", Resource)
    monkeypatch.setattr(gateway, "Deployment", Resource)
    monkeypatch.setattr(gateway.httpx2, "AsyncClient", Client)
    return observed


async def test_gateway_verifies_installed_controllers(observed_resources: list[tuple[str, str]]) -> None:
    """Observe installed controllers and verify HTTPS without any Kubernetes writes."""

    # Exercise the actual verifier against boundaries that expose no mutation methods.
    provider = gateway.Gateway(FakeKubernetes())
    await provider.verify("https://gateway.example")
    assert ("longlink-system", "compute-release") in observed_resources
    assert ("cnpg-system", "cnpg-controller-manager") in observed_resources
    assert ("rustfs", "rustfs") in observed_resources


async def test_gateway_propagates_controller_lookup_errors(
    monkeypatch: pytest.MonkeyPatch, observed_resources: list[tuple[str, str]]
) -> None:
    """Preserve unexpected Kubernetes observation errors."""

    # Fail at the Deployment boundary after reading release metadata and TLS configuration.
    def deployment(*args: object, **kwargs: object) -> None:
        """Report the Kubernetes lookup error."""

        raise LookupError("controller unavailable")

    monkeypatch.setattr(gateway, "Deployment", deployment)
    provider = gateway.Gateway(FakeKubernetes())
    with pytest.raises(LookupError, match="controller unavailable"):
        await provider.verify("https://gateway.example")


async def test_gateway_translates_readiness_timeout(monkeypatch: pytest.MonkeyPatch, observed_resources: list[tuple[str, str]]) -> None:
    """Expose readiness deadline failures without attempting an infrastructure repair."""

    # Expire the current-rollout lookup inside the verifier's deadline.
    def deployment(*args: object, **kwargs: object) -> None:
        """Report the expired deadline."""

        raise TimeoutError

    monkeypatch.setattr(gateway, "Deployment", deployment)
    provider = gateway.Gateway(FakeKubernetes())
    with pytest.raises(RuntimeError, match="Shared controllers or verified Kourier endpoint did not become ready"):
        await provider.verify("https://gateway.example")


def test_compute_package_keeps_gateway_tls_and_ingress_boundaries() -> None:
    """Validate the actual external package's network boundary and TLS-only listener."""

    # Render the production Kustomize bases rather than reproducing their patches in tests.
    root = Path(__file__).resolve().parents[3] / "k8s"
    policies = subprocess.run(["kubectl", "kustomize", str(root / "boundaries")], check=True, capture_output=True, text=True)
    gateway_release = subprocess.run(["kubectl", "kustomize", str(root / "operators/kourier")], check=True, capture_output=True, text=True)
    assert any(document["kind"] == "NetworkPolicy" for document in yaml.safe_load_all(policies.stdout))
    documents = list(yaml.safe_load_all(gateway_release.stdout))
    service = next(document for document in documents if document["kind"] == "Service" and document["metadata"]["name"] == "kourier")
    assert service["spec"]["ports"] == [{"name": "https", "port": 443, "targetPort": 8444, "protocol": "TCP"}]
    assert not any(document["kind"] == "Secret" and document["metadata"]["name"] == "longlink-gateway-tls" for document in documents)
