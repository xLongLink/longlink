import pytest
import ipaddress
from kr8s import NotFoundError
from uuid import UUID
from conftest import FakeKubernetes
from cryptography import x509
from src.kubernetes import gateway
from cryptography.x509.oid import ExtendedKeyUsageOID
from src.kubernetes.gateway import generate_gateway_tls

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("address", "san_type", "expected_san"),
    [
        pytest.param("192.0.2.1", x509.IPAddress, ipaddress.ip_address("192.0.2.1"), id="IPv4"),
        pytest.param("gateway.example.test", x509.DNSName, "gateway.example.test", id="DNS"),
    ],
)
def test_gateway_tls_covers_the_compute_address(
    address: str,
    san_type: type[x509.IPAddress] | type[x509.DNSName],
    expected_san: ipaddress.IPv4Address | str,
) -> None:
    """Generate endpoint-bound server and Platform client certificates trusted by one Compute CA."""

    # Generate material for one compute Gateway endpoint.
    tls = generate_gateway_tls(UUID("00000000-0000-4000-8000-000000000001"), address)

    # Verify both leaf certificates preserve their issuer and intended usage, and the server covers the endpoint.
    ca_certificate = x509.load_pem_x509_certificate(tls.ca_certificate.encode("ascii"))
    server_certificate = x509.load_pem_x509_certificate(tls.server_certificate.encode("ascii"))
    client_certificate = x509.load_pem_x509_certificate(tls.client_certificate.encode("ascii"))
    names = server_certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    assert server_certificate.issuer == ca_certificate.subject
    assert client_certificate.issuer == ca_certificate.subject
    assert names.get_values_for_type(san_type) == [expected_san]
    assert list(server_certificate.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value) == [ExtendedKeyUsageOID.SERVER_AUTH]
    assert list(client_certificate.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value) == [ExtendedKeyUsageOID.CLIENT_AUTH]


async def test_gateway_install_rejects_an_unmanaged_controller(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject an existing Envoy Gateway deployment not owned by LongLink."""

    # Arrange
    class Deployment:
        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Expose an unrelated controller Deployment."""

            self.raw = {"metadata": {}}

        async def refresh(self) -> None:
            """Keep the unrelated Deployment current."""

    monkeypatch.setattr(gateway, "Deployment", Deployment)

    # Act and assert
    with pytest.raises(ValueError, match="Envoy Gateway is not managed by LongLink"):
        await gateway.Gateway(FakeKubernetes())._install_controller()


async def test_gateway_install_propagates_controller_lookup_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Propagate controller Deployment API errors other than absence."""

    # Arrange
    class KubernetesError(Exception):
        """Represent an unexpected Kubernetes API error."""

    class Deployment:
        """Fail while checking whether the controller exists."""

        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Accept the Kubernetes API client."""

        async def refresh(self) -> None:
            """Report an unexpected Kubernetes API failure."""

            raise KubernetesError

    monkeypatch.setattr(gateway, "Deployment", Deployment)

    # Act and assert
    with pytest.raises(KubernetesError):
        await gateway.Gateway(FakeKubernetes())._install_controller()


async def test_gateway_install_validates_the_complete_bundle_before_applying(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject a malformed bundled manifest before changing the cluster."""

    # Arrange
    class Deployment:
        """Report that the controller Deployment does not exist."""

        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Accept the Kubernetes API client."""

        async def refresh(self) -> None:
            """Report the controller as absent."""

            raise NotFoundError("Deployment missing")

    async def unexpected_apply(_resource: object) -> None:
        """Reject cluster changes after malformed bundle input."""

        raise AssertionError("Malformed bundle must not be applied")

    monkeypatch.setattr(gateway, "Deployment", Deployment)
    monkeypatch.setattr(
        gateway.gzip,
        "decompress",
        lambda _manifest: b"apiVersion: v1\nkind: Service\nmetadata:\n  name: valid\n---\n- invalid",
    )
    monkeypatch.setattr(gateway, "apply", unexpected_apply)

    # Act and assert
    with pytest.raises(ValueError, match="manifest must contain mapping documents"):
        await gateway.Gateway(FakeKubernetes())._install_controller()


@pytest.mark.parametrize(
    ("installed_version", "certgen_exists"),
    [
        pytest.param(None, True, id="fresh-partial"),
        pytest.param("v1.7.0", False, id="managed-upgrade-partial"),
    ],
)
async def test_gateway_install_applies_the_bundled_controller_manifest(
    monkeypatch: pytest.MonkeyPatch,
    installed_version: str | None,
    certgen_exists: bool,
) -> None:
    """Reconcile the complete controller bundle across independent partial installations."""

    # Arrange
    applied: list[dict[str, object]] = []
    certgen_events: list[str] = []

    class Deployment:
        """Expose an absent or older managed controller before a ready rollout."""

        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Initialize one controller lookup."""

            self.raw = {
                "metadata": {
                    "annotations": ({gateway.ENVOY_GATEWAY_VERSION_ANNOTATION: installed_version} if installed_version is not None else {}),
                    "generation": 1,
                },
                "spec": {"replicas": 1},
                "status": {
                    "observedGeneration": 1,
                    "replicas": 1,
                    "updatedReplicas": 1,
                    "readyReplicas": 1,
                    "availableReplicas": 1,
                },
            }
            self.metadata = self.raw["metadata"]
            self.spec = self.raw["spec"]
            self.refreshes = 0

        async def refresh(self) -> None:
            """Report fresh-install absence once, then a ready rollout."""

            self.refreshes += 1
            if installed_version is None and self.refreshes == 1:
                raise NotFoundError("Deployment missing")

    class Resource:
        """Represent one parsed controller resource."""

        def __init__(self, raw: dict[str, object]) -> None:
            """Keep the desired resource manifest."""

            self.raw = raw

        async def delete(self) -> None:
            """Delete the previous immutable certificate Job when installed."""

            certgen_events.append("delete")
            if not certgen_exists:
                raise NotFoundError("Job missing")

        async def refresh(self) -> None:
            """Keep the fake resource current."""

        async def wait(self, conditions: list[str] | str) -> None:
            """Complete Job deletion or certificate generation."""

            if conditions == "delete":
                certgen_events.append("wait-delete")
                return
            assert conditions == ["condition=Complete", "condition=Failed"]
            certgen_events.append("wait-complete")
            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    class CustomResourceDefinition(Resource):
        """Identify CRDs that require establishment."""

        async def refresh(self) -> None:
            """Mark the CRD established after it is applied."""

            self.raw["status"] = {"conditions": [{"type": "Established", "status": "True"}]}

    def object_from_spec(document: dict[str, object], api: object) -> Resource:
        """Construct a deterministic fake resource."""

        if document.get("kind") == "CustomResourceDefinition":
            return CustomResourceDefinition(document)
        return Resource(document)

    async def apply(resource: Resource) -> None:
        """Record each resource sent to Kubernetes."""

        applied.append(resource.raw)
        if resource.raw.get("kind") == "Job":
            certgen_events.append("apply")

    monkeypatch.setattr(gateway, "Deployment", Deployment)
    monkeypatch.setattr(gateway, "CustomResourceDefinition", CustomResourceDefinition)
    monkeypatch.setattr(gateway, "MutatingWebhookConfigurationResource", lambda document, api: Resource(document))
    monkeypatch.setattr(gateway, "object_from_spec", object_from_spec)
    monkeypatch.setattr(gateway, "apply", apply)

    # Act
    await gateway.Gateway(FakeKubernetes())._install_controller()

    # Assert
    kinds = [resource.get("kind") for resource in applied]
    last_crd = max(index for index, kind in enumerate(kinds) if kind == "CustomResourceDefinition")
    first_regular_resource = next(index for index, kind in enumerate(kinds) if kind != "CustomResourceDefinition")
    assert last_crd < first_regular_resource
    assert gateway.ENVOY_GATEWAY_IGNORED_KINDS.isdisjoint(kinds)
    assert "MutatingWebhookConfiguration" in kinds
    assert kinds[-1] == "Job"

    deployment = next(resource for resource in applied if resource.get("kind") == "Deployment")
    metadata = deployment.get("metadata")
    assert isinstance(metadata, dict)
    annotations = metadata.get("annotations")
    assert isinstance(annotations, dict)
    assert annotations[gateway.ENVOY_GATEWAY_VERSION_ANNOTATION] == gateway.ENVOY_GATEWAY_VERSION
    expected_events = ["delete", "apply", "wait-complete"]
    if certgen_exists:
        expected_events.insert(1, "wait-delete")
    assert certgen_events == expected_events


async def test_gateway_install_translates_resource_apply_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    """Report when the bundled controller cannot be applied before its deadline."""

    # Arrange
    class Deployment:
        """Report that the controller Deployment does not exist."""

        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Accept the Kubernetes API client."""

        async def refresh(self) -> None:
            """Report the controller as absent."""

            raise NotFoundError("Deployment missing")

    async def apply(_resource: object) -> None:
        """Simulate a Kubernetes apply timeout."""

        raise TimeoutError

    monkeypatch.setattr(gateway, "Deployment", Deployment)
    monkeypatch.setattr(gateway, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match=f"Envoy Gateway {gateway.ENVOY_GATEWAY_VERSION} did not become ready"):
        await gateway.Gateway(FakeKubernetes())._install_controller()


async def test_gateway_delete_waits_for_gateway_class_termination(monkeypatch: pytest.MonkeyPatch) -> None:
    """Issue GatewayClass deletion once and stop when its terminal absence is observed."""

    # Make existence transition from present to absent after one delete request.
    deleted: list[bool] = []

    class GatewayClass:
        def __init__(self, name: str, api: object) -> None:
            """Initialize the fake GatewayClass."""

        async def delete(self) -> None:
            """Record deletion."""

            deleted.append(True)

        async def wait(self, conditions: str) -> None:
            """Complete GatewayClass deletion."""

            assert conditions == "delete"

    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)

    # The terminal state completes without a second delete request.
    await gateway.Gateway(FakeKubernetes()).delete()
    assert deleted == [True]


async def test_gateway_delete_translates_termination_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    """Report GatewayClass termination when its deletion deadline expires."""

    # Arrange
    class GatewayClass:
        """Keep the GatewayClass present while Kubernetes deletes it."""

        def __init__(self, _name: str, api: object) -> None:
            """Initialize the pending GatewayClass."""

        async def delete(self) -> None:
            """Accept the GatewayClass deletion request."""

        async def wait(self, conditions: str) -> None:
            """Expire the deletion deadline while waiting."""

            assert conditions == "delete"
            raise TimeoutError

    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes GatewayClass did not terminate: longlink-envoy"):
        await gateway.Gateway(FakeKubernetes()).delete()


async def test_gateway_apply_waits_for_an_allocated_address(monkeypatch: pytest.MonkeyPatch) -> None:
    """Wait for controller class acceptance and an allocated Gateway address."""

    # Arrange
    sleeps: list[float] = []

    class Resource:
        """Represent a rendered Gateway API resource."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep the resource status used for readiness polling."""

            self.raw = raw
            metadata = raw.get("metadata")
            self.metadata = metadata if isinstance(metadata, dict) else {}
            self.metadata["generation"] = 1
            kind = raw.get("kind")
            assert isinstance(kind, str)
            resources[kind] = self

            # Supply only status fields that Kubernetes adds to the committed desired manifest.
            if kind == "GatewayClass":
                self.raw["status"] = {"conditions": [{"type": "Accepted", "status": "False", "observedGeneration": 1}]}
            elif kind == "Gateway":
                self.raw["status"] = {
                    "conditions": [{"type": "Programmed", "status": "True", "observedGeneration": 1}],
                    "listeners": [
                        {
                            "name": "https",
                            "conditions": [
                                {"type": condition_type, "status": "True", "observedGeneration": 1}
                                for condition_type in ("Accepted", "Programmed", "ResolvedRefs")
                            ],
                        }
                    ],
                    "addresses": {},
                }
            elif kind == "ClientTrafficPolicy":
                self.raw["status"] = {
                    "ancestors": [
                        {
                            "ancestorRef": {"name": "longlink", "namespace": "longlink-system"},
                            "controllerName": "gateway.envoyproxy.io/gatewayclass-controller",
                            "conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}],
                        }
                    ]
                }

        async def refresh(self) -> None:
            """Keep the resource status current."""

    resources: dict[str, Resource] = {}

    async def install(self: gateway.Gateway) -> None:
        """Skip controller installation for readiness polling."""

    async def apply(_resource: gateway.APIObject | Resource) -> None:
        """Accept a rendered Kubernetes resource."""

    async def sleep(delay: float) -> None:
        """Accept the class before allocating the Gateway address."""

        sleeps.append(delay)
        if len(sleeps) == 1:
            resources["GatewayClass"].raw["status"] = {"conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}]}
            return
        status = resources["Gateway"].raw["status"]
        assert isinstance(status, dict)
        status["addresses"] = [{"value": ""}] if len(sleeps) == 2 else [{"value": "192.0.2.1"}]

    monkeypatch.setattr(gateway.Gateway, "_install_controller", install)
    monkeypatch.setattr(gateway, "GatewayResource", Resource)
    monkeypatch.setattr(gateway, "ClientTrafficPolicyResource", Resource)
    monkeypatch.setattr(gateway, "GatewayClassResource", Resource)
    monkeypatch.setattr(gateway, "apply", apply)
    monkeypatch.setattr(gateway.asyncio, "sleep", sleep)

    # Act
    address = await gateway.Gateway(FakeKubernetes()).apply()

    # Assert
    assert address == "192.0.2.1"


async def test_gateway_apply_applies_tls_and_policy_before_the_gateway(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply Gateway TLS Secrets and the policy before exposing the Gateway."""

    # Arrange
    applied: list[dict[str, object]] = []

    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep rendered resource state for apply assertions."""

            self.raw = raw
            metadata = raw.get("metadata")
            self.metadata = metadata if isinstance(metadata, dict) else {}
            self.metadata["generation"] = 1

        async def refresh(self) -> None:
            """Add the ready runtime status for this resource."""

            if self.raw.get("kind") == "GatewayClass":
                self.raw["status"] = {"conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}]}
            elif self.raw.get("kind") == "Gateway":
                self.raw["status"] = {
                    "conditions": [{"type": "Programmed", "status": "True", "observedGeneration": 1}],
                    "listeners": [
                        {
                            "name": "https",
                            "conditions": [
                                {"type": condition_type, "status": "True", "observedGeneration": 1}
                                for condition_type in ("Accepted", "Programmed", "ResolvedRefs")
                            ],
                        }
                    ],
                    "addresses": [{"value": "192.0.2.1"}],
                }
            elif self.raw.get("kind") == "ClientTrafficPolicy":
                self.raw["status"] = {
                    "ancestors": [
                        {
                            "ancestorRef": {"name": "longlink", "namespace": "longlink-system"},
                            "controllerName": "gateway.envoyproxy.io/gatewayclass-controller",
                            "conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}],
                        }
                    ]
                }

    async def install(self: gateway.Gateway) -> None:
        """Skip controller installation for TLS application testing."""

    async def apply(resource: gateway.APIObject | Resource) -> None:
        """Record the resource sent to Kubernetes."""

        applied.append(resource.raw)

    monkeypatch.setattr(gateway.Gateway, "_install_controller", install)
    monkeypatch.setattr(gateway, "GatewayResource", Resource)
    monkeypatch.setattr(gateway, "ClientTrafficPolicyResource", Resource)
    monkeypatch.setattr(gateway, "GatewayClassResource", Resource)
    monkeypatch.setattr(gateway, "apply", apply)

    # Act
    address = await gateway.Gateway(FakeKubernetes()).apply(
        gateway.GatewayTLS("ca certificate", "server certificate", "server private key")
    )

    # Assert
    assert address == "192.0.2.1"
    assert [resource.get("kind") for resource in applied] == [
        "Namespace",
        "GatewayClass",
        "Secret",
        "Secret",
        "ClientTrafficPolicy",
        "Gateway",
    ]
    assert applied[2] == {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {"name": "longlink-gateway-tls", "namespace": "longlink-system"},
        "stringData": {"tls.crt": "server certificate", "tls.key": "server private key"},
        "type": "kubernetes.io/tls",
    }
    assert applied[3] == {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {"name": "longlink-gateway-client-ca", "namespace": "longlink-system"},
        "stringData": {"ca.crt": "ca certificate"},
        "type": "Opaque",
    }


async def test_gateway_replace_tls_applies_server_and_client_ca_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace the Gateway server identity and client CA Secrets."""

    # Arrange
    applied: list[dict[str, object]] = []

    async def apply(resource: gateway.APIObject) -> None:
        """Record the Secret sent to Kubernetes."""

        applied.append(resource.raw)

    monkeypatch.setattr(gateway, "apply", apply)

    # Act
    await gateway.Gateway(FakeKubernetes()).replace_tls(
        gateway.GatewayTLS("replacement CA", "replacement certificate", "replacement private key")
    )

    # Assert
    assert applied == [
        {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {"name": "longlink-gateway-tls", "namespace": "longlink-system"},
            "stringData": {"tls.crt": "replacement certificate", "tls.key": "replacement private key"},
            "type": "kubernetes.io/tls",
        },
        {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {"name": "longlink-gateway-client-ca", "namespace": "longlink-system"},
            "stringData": {"ca.crt": "replacement CA"},
            "type": "Opaque",
        },
    ]
