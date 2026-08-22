import pytest
import ipaddress
from uuid import UUID
from cryptography import x509
from src.kubernetes import gateway
from cryptography.x509.oid import ExtendedKeyUsageOID
from src.kubernetes.gateway import generate_gateway_tls

pytestmark = pytest.mark.no_db


def test_gateway_tls_covers_the_compute_address() -> None:
    """Generate server and Platform client certificates trusted by one Compute CA."""

    # Generate material for one IPv4 compute gateway address.
    address = "192.0.2.1"
    tls = generate_gateway_tls(UUID("00000000-0000-4000-8000-000000000001"), address)

    # Verify both leaf certificates preserve their issuing CA and intended extended usage.
    ca_certificate = x509.load_pem_x509_certificate(tls.ca_certificate.encode("ascii"))
    server_certificate = x509.load_pem_x509_certificate(tls.server_certificate.encode("ascii"))
    client_certificate = x509.load_pem_x509_certificate(tls.client_certificate.encode("ascii"))
    names = server_certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    assert server_certificate.issuer == ca_certificate.subject
    assert client_certificate.issuer == ca_certificate.subject
    assert names.get_values_for_type(x509.IPAddress) == [ipaddress.ip_address(address)]
    assert list(server_certificate.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value) == [ExtendedKeyUsageOID.SERVER_AUTH]
    assert list(client_certificate.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value) == [ExtendedKeyUsageOID.CLIENT_AUTH]


async def test_gateway_install_skips_manifest_when_controller_is_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reuse an accepted GatewayClass without fetching or applying the controller manifest."""

    # Return a GatewayClass which has already been accepted by Envoy Gateway.
    class GatewayClass:
        def __init__(self, name: str, api: object) -> None:
            """Initialize the accepted GatewayClass."""

            self.raw = {"status": {"conditions": [{"type": "Accepted", "status": "True"}]}}

        async def exists(self) -> bool:
            """Report an existing GatewayClass."""

            return True

        async def refresh(self) -> None:
            """Keep the accepted status current."""

    class Kubernetes:
        async def api(self) -> object:
            """Return an opaque Kubernetes API client."""

            return object()

    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)

    # The accepted terminal state returns before any network manifest fetch.
    await gateway.Gateway(Kubernetes()).install_controller()  # type: ignore[arg-type]


async def test_gateway_delete_waits_for_gateway_class_termination(monkeypatch: pytest.MonkeyPatch) -> None:
    """Issue GatewayClass deletion once and stop when its terminal absence is observed."""

    # Make existence transition from present to absent after one delete request.
    deleted: list[bool] = []

    class GatewayClass:
        def __init__(self, name: str, api: object) -> None:
            """Initialize the fake GatewayClass."""

            self.metadata: dict[str, object] = {}

        async def exists(self) -> bool:
            """Report presence until deletion has been requested."""

            return not deleted

        async def refresh(self) -> None:
            """Refresh the fake resource."""

        async def delete(self) -> None:
            """Record deletion."""

            deleted.append(True)

    class Kubernetes:
        async def api(self) -> object:
            """Return an opaque Kubernetes API client."""

            return object()

    async def sleep(delay: float) -> None:
        """Avoid waiting in the polling test."""

    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)
    monkeypatch.setattr(gateway.asyncio, "sleep", sleep)

    # The absent terminal state completes without a second delete request.
    await gateway.Gateway(Kubernetes()).delete()  # type: ignore[arg-type]
    assert deleted == [True]


async def test_gateway_apply_returns_when_programmed_authenticated_and_addressed(monkeypatch: pytest.MonkeyPatch) -> None:
    """Publish the first Gateway address only after all readiness conditions are terminal."""

    # Supply ready Gateway and policy resources without connecting to Kubernetes.
    class Resource:
        def __init__(self, raw: dict[str, object], api: object) -> None:
            """Keep rendered resource state."""

            self.raw = raw

        async def refresh(self) -> None:
            """Keep the ready resource state."""

    class Kubernetes:
        async def api(self) -> object:
            """Return an opaque Kubernetes API client."""

            return object()

    async def install(self: gateway.Gateway) -> None:
        """Skip controller installation for readiness testing."""

    async def apply(resource: object) -> None:
        """Accept rendered Kubernetes resources."""

    def resource_class(name: str, *args: object, **kwargs: object):
        """Build the ready Gateway or ClientTrafficPolicy resource class."""

        return Resource

    monkeypatch.setattr(gateway.Gateway, "install_controller", install)
    monkeypatch.setattr(gateway.templates, "readyml_list", lambda path: ({}, {}, {"status": {"conditions": [{"type": "Programmed", "status": "True"}], "addresses": [{"value": "192.0.2.1"}]}}, {"status": {"ancestors": [{"conditions": [{"type": "Accepted", "status": "True"}]}]}}))
    monkeypatch.setattr(gateway, "new_class", resource_class)
    monkeypatch.setattr(gateway, "Namespace", Resource)
    monkeypatch.setattr(gateway, "GatewayClassResource", Resource)
    monkeypatch.setattr(gateway, "apply", apply)

    # All readiness conditions produce the externally reachable Gateway endpoint.
    assert await gateway.Gateway(Kubernetes()).apply() == "192.0.2.1"  # type: ignore[arg-type]
