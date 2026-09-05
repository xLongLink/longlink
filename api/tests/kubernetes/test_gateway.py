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


async def test_gateway_install_reconciles_the_ready_managed_version(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reapply LongLink's bundle to repair a ready controller installation."""

    # Return the desired current controller rollout.
    class Deployment:
        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Initialize the ready controller Deployment."""

            self.raw = {
                "metadata": {
                    "generation": 1,
                    "annotations": {gateway.ENVOY_GATEWAY_VERSION_ANNOTATION: gateway.ENVOY_GATEWAY_VERSION},
                },
                "spec": {
                    "replicas": 1,
                    "template": {
                        "spec": {"containers": [{"name": "envoy-gateway", "image": gateway.ENVOY_GATEWAY_IMAGE}]}
                    },
                },
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

        async def refresh(self) -> None:
            """Keep the ready rollout current."""

    monkeypatch.setattr(gateway, "Deployment", Deployment)

    def unexpected_decompress(_manifest: bytes) -> bytes:
        """Confirm the ready installation still loads desired state."""

        raise AssertionError("Managed Envoy Gateway must load the bundle")

    monkeypatch.setattr(gateway.gzip, "decompress", unexpected_decompress)

    # Release reconciliation reapplies the complete owned controller inventory.
    with pytest.raises(AssertionError, match="Managed Envoy Gateway must load the bundle"):
        await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]


async def test_gateway_install_rejects_an_unmanaged_controller(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reject an existing Envoy Gateway deployment not owned by LongLink."""

    # Arrange
    class Deployment:
        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Expose an unrelated controller Deployment."""

            self.raw = {
                "metadata": {},
                "spec": {
                    "template": {
                        "spec": {
                            "containers": [
                                {"name": "envoy-gateway", "image": gateway.LEGACY_ENVOY_GATEWAY_IMAGE}
                            ]
                        }
                    }
                },
            }

        async def refresh(self) -> None:
            """Keep the unrelated Deployment current."""

    class GatewayClass:
        """Report that the legacy controller has no LongLink-owned class."""

        def __init__(self, _name: str, api: object) -> None:
            """Accept the Kubernetes API client."""

        async def refresh(self) -> None:
            """Report the LongLink class as absent."""

            raise NotFoundError("GatewayClass missing")

    monkeypatch.setattr(gateway, "Deployment", Deployment)
    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)

    # Act and assert
    with pytest.raises(ValueError, match="Envoy Gateway is not managed by LongLink"):
        await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]


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
        await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]


async def test_gateway_install_loads_the_bundle_when_controller_is_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    """Install the bundled controller when its Deployment is absent."""

    # Arrange
    class Deployment:
        """Report that the controller Deployment does not exist."""

        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Accept the Kubernetes API client."""

        async def refresh(self) -> None:
            """Report the controller as absent."""

            raise NotFoundError("Deployment missing")

    def decompress(_manifest: bytes) -> bytes:
        """Confirm installation loads the bundled manifest."""

        raise AssertionError("Missing controller must load the bundle")

    monkeypatch.setattr(gateway, "Deployment", Deployment)
    monkeypatch.setattr(gateway.gzip, "decompress", decompress)

    # Act and assert
    with pytest.raises(AssertionError, match="Missing controller must load the bundle"):
        await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]


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
    monkeypatch.setattr(gateway.gzip, "decompress", lambda _manifest: b"- invalid")
    monkeypatch.setattr(gateway, "apply", unexpected_apply)

    # Act and assert
    with pytest.raises(ValueError, match="manifest must contain mapping documents"):
        await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]


async def test_gateway_install_applies_the_bundled_controller_manifest(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply the supported resources from LongLink's bundled controller manifest."""

    # Arrange
    applied: list[dict[str, object]] = []
    deleted: list[str] = []

    deployments = 0

    class Deployment:
        """Transition from an absent controller to a ready rollout."""

        def __init__(self, _name: str, namespace: str, api: object) -> None:
            """Initialize one controller lookup."""

            nonlocal deployments
            deployments += 1
            self.raw = {
                "metadata": {"generation": 1},
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

        async def refresh(self) -> None:
            """Report absence before installation and readiness afterward."""

            if deployments == 1:
                raise NotFoundError("Deployment missing")

    manifest = b"""
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: gateways.gateway.networking.k8s.io
---
apiVersion: batch/v1
kind: Job
metadata:
  name: eg-gateway-helm-certgen
---
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: envoy-gateway
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: envoy-gateway
---
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: envoy-gateway
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: envoy-gateway
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: envoy-gateway
---
apiVersion: v1
kind: Service
metadata:
  name: envoy-gateway
"""

    class Resource:
        """Represent one parsed controller resource."""

        def __init__(self, raw: dict[str, object]) -> None:
            """Keep the desired resource manifest."""

            self.raw = raw
            self._exists = raw.get("kind") == "Job"

        async def exists(self) -> bool:
            """Report the existing certificate Job until it is deleted."""

            return self._exists

        async def delete(self) -> None:
            """Delete the previous immutable certificate Job."""

            deleted.append("eg-gateway-helm-certgen")
            self._exists = False

        async def refresh(self) -> None:
            """Keep the fake resource current."""

        async def wait(self, conditions: list[str]) -> None:
            """Complete the certificate generation Job."""

            assert conditions == ["condition=Complete", "condition=Failed"]
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

        applied.append(resource.raw.copy())

    monkeypatch.setattr(gateway, "Deployment", Deployment)
    monkeypatch.setattr(gateway, "CustomResourceDefinition", CustomResourceDefinition)
    monkeypatch.setattr(gateway, "MutatingWebhookConfigurationResource", lambda document, api: Resource(document))
    monkeypatch.setattr(gateway, "object_from_spec", object_from_spec)
    monkeypatch.setattr(gateway.gzip, "decompress", lambda _manifest: manifest)
    monkeypatch.setattr(gateway, "apply", apply)

    # Act
    await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]

    # Assert
    assert applied == [
        {
            "apiVersion": "apiextensions.k8s.io/v1",
            "kind": "CustomResourceDefinition",
            "metadata": {"name": "gateways.gateway.networking.k8s.io"},
        },
        {
            "apiVersion": "admissionregistration.k8s.io/v1",
            "kind": "MutatingWebhookConfiguration",
            "metadata": {"name": "envoy-gateway"},
        },
        {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": "envoy-gateway",
                "annotations": {gateway.ENVOY_GATEWAY_VERSION_ANNOTATION: gateway.ENVOY_GATEWAY_VERSION},
            },
        },
        {"apiVersion": "v1", "kind": "Service", "metadata": {"name": "envoy-gateway"}},
        {"apiVersion": "batch/v1", "kind": "Job", "metadata": {"name": "eg-gateway-helm-certgen"}},
    ]
    assert deleted == ["eg-gateway-helm-certgen"]


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

    class Resource:
        """Represent one parsed controller resource."""

        def __init__(self, raw: dict[str, object]) -> None:
            """Keep the desired resource manifest."""

            self.raw = raw

    async def apply(_resource: object) -> None:
        """Simulate a Kubernetes apply timeout."""

        raise TimeoutError

    monkeypatch.setattr(gateway, "Deployment", Deployment)
    monkeypatch.setattr(gateway.gzip, "decompress", lambda _manifest: b"apiVersion: v1\nkind: Service\nmetadata:\n  name: envoy-gateway\n")
    monkeypatch.setattr(gateway, "object_from_spec", lambda document, api: Resource(document))
    monkeypatch.setattr(gateway, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match=f"Envoy Gateway {gateway.ENVOY_GATEWAY_VERSION} did not become ready"):
        await gateway.Gateway(FakeKubernetes()).install_controller()  # type: ignore[arg-type]


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


async def test_gateway_delete_translates_termination_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    """Report GatewayClass termination when its deletion deadline expires."""

    # Arrange
    class Timeout:
        """Provide the Gateway deletion deadline context."""

        async def __aenter__(self) -> "Timeout":
            """Start the simulated deletion deadline."""

            return self

        async def __aexit__(self, *_args: object) -> None:
            """Allow the polling timeout to propagate."""

    class GatewayClass:
        """Keep the GatewayClass present while Kubernetes deletes it."""

        def __init__(self, _name: str, api: object) -> None:
            """Initialize the pending GatewayClass."""

            self.metadata: dict[str, object] = {"deletionTimestamp": "2026-08-24T00:00:00Z"}

        async def exists(self) -> bool:
            """Report that GatewayClass deletion has not finished."""

            return True

        async def refresh(self) -> None:
            """Keep the pending deletion state unchanged."""

    async def sleep(_delay: float) -> None:
        """Expire the deletion deadline during polling."""

        raise TimeoutError

    monkeypatch.setattr(gateway.asyncio, "timeout", lambda _delay: Timeout())
    monkeypatch.setattr(gateway, "GatewayClassResource", GatewayClass)
    monkeypatch.setattr(gateway.asyncio, "sleep", sleep)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes GatewayClass did not terminate: longlink-envoy"):
        await gateway.Gateway(FakeKubernetes()).delete()  # type: ignore[arg-type]


async def test_gateway_apply_returns_when_programmed_authenticated_and_addressed(monkeypatch: pytest.MonkeyPatch) -> None:
    """Publish the first Gateway address only after all readiness conditions are terminal."""

    # Supply ready Gateway and policy resources without connecting to Kubernetes.
    class Resource:
        def __init__(self, raw: dict[str, object], api: object) -> None:
            """Keep rendered resource state."""

            self.raw = raw
            metadata = raw.get("metadata")
            self.metadata = metadata if isinstance(metadata, dict) else {}

        async def refresh(self) -> None:
            """Keep the ready resource state."""

    async def install(self: gateway.Gateway) -> None:
        """Skip controller installation for readiness testing."""

    async def apply(resource: object) -> None:
        """Accept rendered Kubernetes resources."""

    monkeypatch.setattr(gateway.Gateway, "install_controller", install)
    monkeypatch.setattr(
        gateway.templates,
        "readyml_list",
        lambda path: (
            {},
            {
                "metadata": {"generation": 1},
                "status": {"conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}]},
            },
            {
                "metadata": {"generation": 1},
                "status": {
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
                },
            },
            {
                "metadata": {"generation": 1},
                "status": {
                    "ancestors": [
                        {
                            "ancestorRef": {"name": "longlink", "namespace": "longlink-system"},
                            "controllerName": "gateway.envoyproxy.io/gatewayclass-controller",
                            "conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}],
                        }
                    ]
                },
            },
        ),
    )
    monkeypatch.setattr(gateway, "GatewayResource", Resource)
    monkeypatch.setattr(gateway, "ClientTrafficPolicyResource", Resource)
    monkeypatch.setattr(gateway, "Namespace", Resource)
    monkeypatch.setattr(gateway, "GatewayClassResource", Resource)
    monkeypatch.setattr(gateway, "apply", apply)

    # All readiness conditions produce the externally reachable Gateway endpoint.
    assert await gateway.Gateway(FakeKubernetes()).apply() == "192.0.2.1"  # type: ignore[arg-type]


async def test_gateway_apply_waits_for_an_allocated_address(monkeypatch: pytest.MonkeyPatch) -> None:
    """Wait for controller class acceptance and an allocated Gateway address."""

    # Arrange
    gateway_class_manifest: dict[str, object] = {
        "metadata": {"generation": 1},
        "status": {"conditions": [{"type": "Accepted", "status": "False", "observedGeneration": 1}]},
    }
    gateway_manifest: dict[str, object] = {
        "metadata": {"generation": 1},
        "status": {
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
        },
    }
    sleeps: list[float] = []

    class Resource:
        """Represent a rendered Gateway API resource."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep the resource status used for readiness polling."""

            self.raw = raw
            metadata = raw.get("metadata")
            self.metadata = metadata if isinstance(metadata, dict) else {}

        async def refresh(self) -> None:
            """Keep the resource status current."""

    async def install(self: gateway.Gateway) -> None:
        """Skip controller installation for readiness polling."""

    async def apply(_resource: Resource) -> None:
        """Accept a rendered Kubernetes resource."""

    async def sleep(delay: float) -> None:
        """Accept the class before allocating the Gateway address."""

        sleeps.append(delay)
        if len(sleeps) == 1:
            gateway_class_manifest["status"] = {
                "conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}]
            }
            return
        status = gateway_manifest["status"]
        assert isinstance(status, dict)
        status["addresses"] = [{"value": ""}] if len(sleeps) == 2 else [{"value": "192.0.2.1"}]

    monkeypatch.setattr(gateway.Gateway, "install_controller", install)
    monkeypatch.setattr(
        gateway.templates,
        "readyml_list",
        lambda _path: (
            {},
            gateway_class_manifest,
            gateway_manifest,
            {
                "metadata": {"generation": 1},
                "status": {
                    "ancestors": [
                        {
                            "ancestorRef": {"name": "longlink", "namespace": "longlink-system"},
                            "controllerName": "gateway.envoyproxy.io/gatewayclass-controller",
                            "conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}],
                        }
                    ]
                },
            },
        ),
    )
    monkeypatch.setattr(gateway, "GatewayResource", Resource)
    monkeypatch.setattr(gateway, "ClientTrafficPolicyResource", Resource)
    monkeypatch.setattr(gateway, "Namespace", Resource)
    monkeypatch.setattr(gateway, "GatewayClassResource", Resource)
    monkeypatch.setattr(gateway, "apply", apply)
    monkeypatch.setattr(gateway.asyncio, "sleep", sleep)

    # Act
    address = await gateway.Gateway(FakeKubernetes()).apply()  # type: ignore[arg-type]

    # Assert
    assert address == "192.0.2.1"
    assert sleeps == [5, 5, 5]


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

        async def refresh(self) -> None:
            """Keep the ready resource state."""

    async def install(self: gateway.Gateway) -> None:
        """Skip controller installation for TLS application testing."""

    async def apply(resource: Resource) -> None:
        """Record the resource sent to Kubernetes."""

        applied.append(resource.raw)

    monkeypatch.setattr(gateway.Gateway, "install_controller", install)
    monkeypatch.setattr(
        gateway.templates,
        "readyml_list",
        lambda _path: (
            {"kind": "Namespace", "metadata": {"name": "longlink-system"}},
            {
                "kind": "GatewayClass",
                "metadata": {"name": "longlink-envoy", "generation": 1},
                "status": {"conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}]},
            },
            {
                "kind": "Gateway",
                "metadata": {"generation": 1},
                "status": {
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
                },
            },
            {
                "kind": "ClientTrafficPolicy",
                "metadata": {"generation": 1},
                "status": {
                    "ancestors": [
                        {
                            "ancestorRef": {"name": "longlink", "namespace": "longlink-system"},
                            "controllerName": "gateway.envoyproxy.io/gatewayclass-controller",
                            "conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}],
                        }
                    ]
                },
            },
        ),
    )
    monkeypatch.setattr(gateway, "GatewayResource", Resource)
    monkeypatch.setattr(gateway, "ClientTrafficPolicyResource", Resource)
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
        {
            "kind": "GatewayClass",
            "metadata": {"name": "longlink-envoy", "generation": 1},
            "status": {"conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}]},
        },
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
            "kind": "ClientTrafficPolicy",
            "metadata": {"generation": 1},
            "status": {
                "ancestors": [
                    {
                        "ancestorRef": {"name": "longlink", "namespace": "longlink-system"},
                        "controllerName": "gateway.envoyproxy.io/gatewayclass-controller",
                        "conditions": [{"type": "Accepted", "status": "True", "observedGeneration": 1}],
                    }
                ]
            },
        },
        {
            "kind": "Gateway",
            "metadata": {"generation": 1},
            "status": {
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
            },
        },
    ]


async def test_gateway_replace_tls_applies_server_and_client_ca_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    """Replace the Gateway server identity and client CA Secrets."""

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
