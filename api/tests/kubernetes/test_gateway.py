import pytest
import ipaddress
from uuid import UUID
from conftest import FakeKubernetes
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


def test_gateway_tls_covers_a_hostname() -> None:
    """Generate a server certificate with the compute hostname as its DNS SAN."""

    # Arrange
    address = "gateway.example.test"

    # Act
    tls = generate_gateway_tls(UUID("00000000-0000-4000-8000-000000000001"), address)
    server_certificate = x509.load_pem_x509_certificate(tls.server_certificate.encode("ascii"))

    # Assert
    names = server_certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    assert names.get_values_for_type(x509.DNSName) == [address]


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

    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)

    def unexpected_http_client(**_kwargs: object) -> object:
        """Fail when the accepted controller path attempts a manifest request."""

        raise AssertionError("Accepted GatewayClass must not fetch a manifest")

    monkeypatch.setattr(gateway.httpx2, "AsyncClient", unexpected_http_client)

    # The accepted terminal state returns before any network manifest fetch.
    await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]


async def test_gateway_install_rejects_tampered_manifest_before_applying(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject a controller manifest that does not match its pinned checksum."""

    # Arrange
    class GatewayClass:
        """Report that the controller is not installed."""

        def __init__(self, _name: str, api: object) -> None:
            """Accept the Kubernetes API client."""

        async def exists(self) -> bool:
            """Report no existing GatewayClass."""

            return False

    class Response:
        """Return a deterministic altered manifest."""

        content = b"tampered manifest"

        def raise_for_status(self) -> None:
            """Report a successful transport response."""

    class HttpClient:
        """Provide the altered manifest through the HTTP boundary."""

        def __init__(self, **_kwargs: object) -> None:
            """Accept client configuration."""

        async def __aenter__(self) -> "HttpClient":
            """Enter the HTTP client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the HTTP client context."""

        async def get(self, _url: str) -> Response:
            """Return the altered manifest."""

            return Response()

    async def unexpected_objects_from_files(*_args: object, **_kwargs: object) -> object:
        """Fail if parsing begins before checksum verification."""

        raise AssertionError("tampered manifest was parsed")

    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)
    monkeypatch.setattr(gateway.httpx2, "AsyncClient", HttpClient)
    monkeypatch.setattr(gateway, "objects_from_files", unexpected_objects_from_files)

    # Act and assert
    with pytest.raises(ValueError, match="Envoy Gateway v1.8.3 manifest checksum does not match"):
        await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]


async def test_gateway_install_filters_admission_resources_from_verified_manifest(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply only controller resources needed by LongLink from a verified manifest."""

    # Arrange
    applied: list[dict[str, object]] = []

    class GatewayClass:
        """Report that the controller still needs installation."""

        def __init__(self, _name: str, api: object) -> None:
            """Accept the Kubernetes API client."""

        async def exists(self) -> bool:
            """Report no existing GatewayClass."""

            return False

    class Response:
        """Return a deterministic verified manifest."""

        content = b"verified manifest"

        def raise_for_status(self) -> None:
            """Report a successful transport response."""

    class HttpClient:
        """Provide the verified manifest through the HTTP boundary."""

        def __init__(self, **_kwargs: object) -> None:
            """Accept client configuration."""

        async def __aenter__(self) -> "HttpClient":
            """Enter the HTTP client context."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Exit the HTTP client context."""

        async def get(self, _url: str) -> Response:
            """Return the verified manifest."""

            return Response()

    class Digest:
        """Return the pinned checksum for the deterministic manifest."""

        def hexdigest(self) -> str:
            """Return the expected Envoy Gateway manifest checksum."""

            return "37a62afe9bb07d87e86c5c2cff32f046f17397cb4fca9f2a741165826212d781"

    class Resource:
        """Expose one parsed manifest resource."""

        def __init__(self, raw: dict[str, object]) -> None:
            """Keep the parsed manifest payload."""

            self.raw = raw

    async def objects_from_files(_path: str, *, api: object) -> list[Resource]:
        """Return resources in the upstream manifest order."""

        return [
            Resource({"kind": "CustomResourceDefinition", "metadata": {"name": "gateways.gateway.networking.k8s.io"}}),
            Resource({"kind": "MutatingWebhookConfiguration", "metadata": {"name": "envoy-gateway"}}),
            Resource({"kind": "Deployment", "metadata": {"name": "envoy-gateway"}}),
            Resource({"kind": "ValidatingAdmissionPolicy", "metadata": {"name": "envoy-gateway"}}),
            Resource({"kind": "ValidatingAdmissionPolicyBinding", "metadata": {"name": "envoy-gateway"}}),
            Resource({"kind": "ValidatingWebhookConfiguration", "metadata": {"name": "envoy-gateway"}}),
            Resource({"kind": "Service", "metadata": {"name": "envoy-gateway"}}),
        ]

    async def apply(resource: Resource) -> None:
        """Record each resource sent to Kubernetes."""

        applied.append(resource.raw)

    def sha256(manifest: bytes) -> Digest:
        """Verify the expected deterministic manifest bytes."""

        assert manifest == b"verified manifest"
        return Digest()

    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)
    monkeypatch.setattr(gateway.httpx2, "AsyncClient", HttpClient)
    monkeypatch.setattr(gateway.hashlib, "sha256", sha256)
    monkeypatch.setattr(gateway, "objects_from_files", objects_from_files)
    monkeypatch.setattr(gateway, "apply", apply)

    # Act
    await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]

    # Assert
    assert applied == [
        {"kind": "CustomResourceDefinition", "metadata": {"name": "gateways.gateway.networking.k8s.io"}},
        {"kind": "Deployment", "metadata": {"name": "envoy-gateway"}},
        {"kind": "Service", "metadata": {"name": "envoy-gateway"}},
    ]


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

    async def sleep(delay: float) -> None:
        """Avoid waiting in the polling test."""

    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)
    monkeypatch.setattr(gateway.asyncio, "sleep", sleep)

    # The absent terminal state completes without a second delete request.
    await gateway.Gateway(FakeKubernetes()).delete()  # type: ignore[arg-type]
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
    assert await gateway.Gateway(FakeKubernetes()).apply() == "192.0.2.1"  # type: ignore[arg-type]


async def test_gateway_apply_applies_tls_secrets_before_gateway_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply both Gateway TLS Secrets before the Gateway and its policy."""

    # Arrange
    applied: list[dict[str, object]] = []

    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep rendered resource state for apply assertions."""

            self.raw = raw

        async def refresh(self) -> None:
            """Keep the ready resource state."""

    async def install(self: gateway.Gateway) -> None:
        """Skip controller installation for TLS application testing."""

    async def apply(resource: Resource) -> None:
        """Record the resource sent to Kubernetes."""

        applied.append(resource.raw)

    def resource_class(*_args: object, **_kwargs: object):
        """Build the ready Gateway and ClientTrafficPolicy resource classes."""

        return Resource

    monkeypatch.setattr(gateway.Gateway, "install_controller", install)
    monkeypatch.setattr(
        gateway.templates,
        "readyml_list",
        lambda _path: (
            {"kind": "Namespace", "metadata": {"name": "longlink-system"}},
            {"kind": "GatewayClass", "metadata": {"name": "longlink-envoy"}},
            {
                "kind": "Gateway",
                "status": {
                    "conditions": [{"type": "Programmed", "status": "True"}],
                    "addresses": [{"value": "192.0.2.1"}],
                },
            },
            {"kind": "ClientTrafficPolicy", "status": {"ancestors": [{"conditions": [{"type": "Accepted", "status": "True"}]}]}},
        ),
    )
    monkeypatch.setattr(gateway, "new_class", resource_class)
    monkeypatch.setattr(gateway, "Namespace", Resource)
    monkeypatch.setattr(gateway, "GatewayClassResource", Resource)
    monkeypatch.setattr(gateway, "Secret", Resource)
    monkeypatch.setattr(gateway, "apply", apply)

    # Act
    address = await gateway.Gateway(FakeKubernetes()).apply(  # type: ignore[arg-type]
        gateway.GatewayTLS("ca certificate", "server certificate", "server private key")
    )

    # Assert
    assert address == "192.0.2.1"
    assert applied == [
        {"kind": "Namespace", "metadata": {"name": "longlink-system"}},
        {"kind": "GatewayClass", "metadata": {"name": "longlink-envoy"}},
        {
            "metadata": {"name": "longlink-gateway-tls", "namespace": "longlink-system"},
            "stringData": {"tls.crt": "server certificate", "tls.key": "server private key"},
            "type": "kubernetes.io/tls",
        },
        {
            "metadata": {"name": "longlink-gateway-client-ca", "namespace": "longlink-system"},
            "stringData": {"ca.crt": "ca certificate"},
            "type": "Opaque",
        },
        {
            "kind": "Gateway",
            "status": {
                "conditions": [{"type": "Programmed", "status": "True"}],
                "addresses": [{"value": "192.0.2.1"}],
            },
        },
        {"kind": "ClientTrafficPolicy", "status": {"ancestors": [{"conditions": [{"type": "Accepted", "status": "True"}]}]}},
    ]


async def test_gateway_replace_tls_applies_server_and_client_ca_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace the Gateway server and client CA Secret payloads in order."""

    # Arrange
    applied: list[dict[str, object]] = []

    class Secret:
        """Represent a Kubernetes Secret without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep the Secret payload for apply assertions."""

            self.raw = raw

    async def apply(resource: Secret) -> None:
        """Record the Secret sent to Kubernetes."""

        applied.append(resource.raw)

    monkeypatch.setattr(gateway, "Secret", Secret)
    monkeypatch.setattr(gateway, "apply", apply)

    # Act
    await gateway.Gateway(FakeKubernetes()).replace_tls(  # type: ignore[arg-type]
        gateway.GatewayTLS("replacement CA", "replacement certificate", "replacement private key")
    )

    # Assert
    assert applied == [
        {
            "metadata": {"name": "longlink-gateway-tls", "namespace": "longlink-system"},
            "stringData": {"tls.crt": "replacement certificate", "tls.key": "replacement private key"},
            "type": "kubernetes.io/tls",
        },
        {
            "metadata": {"name": "longlink-gateway-client-ca", "namespace": "longlink-system"},
            "stringData": {"ca.crt": "replacement CA"},
            "type": "Opaque",
        },
    ]
