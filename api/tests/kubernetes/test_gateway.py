import pytest
from typing import Protocol
from conftest import FakeKubernetes
from src.kubernetes import gateway

pytestmark = pytest.mark.no_db


class AppliedResource(Protocol):
    """Expose a rendered manifest at the Kubernetes transport boundary."""

    raw: dict[str, object]


@pytest.fixture
def applied_resources(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, object]]:
    """Capture real release manifests at the Kubernetes and HTTP boundaries."""

    applied: list[dict[str, object]] = []

    class Resource:
        """Represent a rendered resource without contacting Kubernetes."""

        def __init__(self, raw: dict[str, object], api: object | None = None) -> None:
            """Retain the rendered manifest."""

            self.raw = raw
            metadata = raw.get("metadata", {})
            spec = raw.get("spec", {})
            assert isinstance(metadata, dict)
            assert isinstance(spec, dict)
            self.metadata = metadata
            self.spec = spec

        async def exists(self) -> bool:
            """Report a fresh installation without existing webhook state."""

            return False

        async def refresh(self) -> None:
            """Populate certificate authorities that admission controllers inject."""

            if self.raw.get("kind") in {"MutatingWebhookConfiguration", "ValidatingWebhookConfiguration"}:
                self.raw["webhooks"] = [{"clientConfig": {"caBundle": "certificate"}}]

        async def wait(self, condition: str) -> None:
            """Confirm CRDs are established before dependent resources."""

            assert condition == "condition=Established"

    class Deployment(Resource):
        """Expose a current, ready rollout to the production readiness check."""

        async def refresh(self) -> None:
            """Populate controller-owned rollout status."""

            self.metadata["generation"] = 1
            replicas = self.spec.get("replicas", 1)
            self.raw["status"] = {
                "observedGeneration": 1,
                "replicas": replicas,
                "updatedReplicas": replicas,
                "readyReplicas": replicas,
                "availableReplicas": replicas,
            }

    class CustomResourceDefinition(Resource):
        """Identify CRDs that require establishment."""

        async def refresh(self) -> None:
            """Populate the API-server-owned establishment condition."""

            self.raw["status"] = {"conditions": [{"type": "Established", "status": "True"}]}

    class Secret:
        """Expose the operator-managed TLS Secret."""

        def __init__(self, name: str, namespace: str, api: object) -> None:
            """Validate the operator's Secret location."""

            assert (namespace, name) == ("knative-serving", "longlink-gateway-tls")
            self.raw = {"data": {"tls.crt": "certificate", "tls.key": "key"}}

        async def refresh(self) -> None:
            """Keep the configured Secret current."""

    class Client:
        """Return a verified readiness response without contacting a gateway."""

        def __init__(self, **kwargs: object) -> None:
            """Check that verification and environment isolation remain enabled."""

            assert kwargs["trust_env"] is False
            assert kwargs["follow_redirects"] is False
            context = kwargs["verify"]
            assert isinstance(context, gateway.ssl.SSLContext)
            assert context.verify_mode == gateway.ssl.CERT_REQUIRED

        async def __aenter__(self) -> "Client":
            """Enter the HTTP connection lifetime."""

            return self

        async def __aexit__(self, *args: object) -> None:
            """Close the HTTP connection."""

        async def get(self, url: str, headers: dict[str, str]) -> gateway.httpx2.Response:
            """Validate the TLS endpoint and Kourier readiness vhost."""

            assert url == "https://gateway.example/ready"
            assert headers == {"Host": "internalkourier"}
            return gateway.httpx2.Response(200)

    def object_from_spec(document: dict[str, object], api: object) -> Resource:
        """Construct the matching resource boundary for the real manifest."""

        if document["kind"] == "Deployment":
            return Deployment(document)
        if document["kind"] == "CustomResourceDefinition":
            return CustomResourceDefinition(document)
        return Resource(document)

    async def apply(resource: Resource) -> None:
        """Capture manifests sent to Kubernetes."""

        applied.append(resource.raw)

    monkeypatch.setattr(gateway, "object_from_spec", object_from_spec)
    monkeypatch.setattr(gateway, "Deployment", Deployment)
    monkeypatch.setattr(gateway, "CustomResourceDefinition", CustomResourceDefinition)
    monkeypatch.setattr(gateway, "Service", Resource)
    monkeypatch.setattr(gateway, "Secret", Secret)
    monkeypatch.setattr(gateway, "apply", apply)
    monkeypatch.setattr(gateway.httpx2, "AsyncClient", Client)
    return applied


async def test_gateway_install_applies_the_bundled_controller_manifest(applied_resources: list[dict[str, object]]) -> None:
    """Apply the real pinned releases and wait for verified gateway readiness."""

    # Act
    provider = gateway.Gateway(FakeKubernetes())
    await provider.apply("https://gateway.example")

    # Assert
    deployments = {resource["metadata"]["name"] for resource in applied_resources if resource["kind"] == "Deployment"}
    assert {"controller", "3scale-kourier-gateway", "cnpg-controller-manager"} <= deployments
    kourier = next(
        resource for resource in applied_resources if resource["kind"] == "Service" and resource["metadata"]["name"] == "kourier"
    )
    assert kourier["spec"]["ports"] == [{"name": "https", "port": 443, "targetPort": 8444, "protocol": "TCP"}]


async def test_gateway_install_propagates_controller_lookup_errors(
    monkeypatch: pytest.MonkeyPatch, applied_resources: list[dict[str, object]]
) -> None:
    """Propagate unexpected Kubernetes errors during controller reconciliation."""

    # Arrange
    class KubernetesError(Exception):
        """Represent an unexpected Kubernetes API error."""

    async def apply(resource: AppliedResource) -> None:
        """Fail at the Kubernetes boundary."""

        raise KubernetesError

    monkeypatch.setattr(gateway, "apply", apply)

    # Act and assert
    provider = gateway.Gateway(FakeKubernetes())
    with pytest.raises(KubernetesError):
        await provider.apply("https://gateway.example")


async def test_gateway_install_translates_resource_apply_timeout(
    monkeypatch: pytest.MonkeyPatch, applied_resources: list[dict[str, object]]
) -> None:
    """Report failure when a pinned release cannot be applied before its deadline."""

    # Arrange
    async def apply(resource: AppliedResource) -> None:
        """Allow ingress guards, then fail controller installation."""

        if resource.raw["kind"] == "CustomResourceDefinition":
            raise TimeoutError

    monkeypatch.setattr(gateway, "apply", apply)

    # Act and assert
    provider = gateway.Gateway(FakeKubernetes())
    with pytest.raises(RuntimeError, match="Shared controllers or verified Kourier endpoint did not become ready"):
        await provider.apply("https://gateway.example")


async def test_gateway_apply_applies_tls_and_policy_before_the_gateway(applied_resources: list[dict[str, object]]) -> None:
    """Install ingress network guards before shared controllers expose tenant workloads."""

    # Act
    provider = gateway.Gateway(FakeKubernetes())
    await provider.apply("https://gateway.example")

    # Assert
    first_deployment = next(index for index, resource in enumerate(applied_resources) if resource["kind"] == "Deployment")
    policies = [index for index, resource in enumerate(applied_resources) if resource["kind"] == "NetworkPolicy"]
    assert policies
    assert max(policies) < first_deployment
    assert not any(
        resource["kind"] == "Secret" and resource["metadata"]["name"] == "longlink-gateway-tls" for resource in applied_resources
    )


async def test_gateway_delete_waits_for_gateway_class_termination(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete shared namespaces while preserving cluster-scoped database definitions."""

    # Arrange
    deleted: list[str] = []

    class Namespace:
        """Represent one installed shared namespace."""

        def __init__(self, name: str, api: object) -> None:
            """Record the namespace selected by production cleanup."""

            self.name = name

        async def exists(self) -> bool:
            """Report an installed namespace."""

            return True

        async def delete(self) -> None:
            """Record the deletion request."""

            deleted.append(self.name)

        async def wait(self, condition: str) -> None:
            """Complete namespace termination."""

            assert condition == "delete"

    monkeypatch.setattr(gateway, "Namespace", Namespace)

    # Act
    provider = gateway.Gateway(FakeKubernetes())
    await provider.delete()

    # Assert
    assert deleted == ["kourier-system", "knative-serving", "cnpg-system"]


async def test_gateway_delete_translates_termination_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    """Leave namespace termination failures visible to cleanup callers."""

    # Arrange
    class Namespace:
        """Keep a shared namespace terminating."""

        def __init__(self, name: str, api: object) -> None:
            """Accept the namespace location."""

        async def exists(self) -> bool:
            """Report an installed namespace."""

            return True

        async def delete(self) -> None:
            """Accept the deletion request."""

        async def wait(self, condition: str) -> None:
            """Report an expired termination deadline."""

            raise TimeoutError

    monkeypatch.setattr(gateway, "Namespace", Namespace)

    # Act and assert
    provider = gateway.Gateway(FakeKubernetes())
    with pytest.raises(TimeoutError):
        await provider.delete()
