import gzip
import yaml
import asyncio
import ipaddress
from kr8s import NotFoundError
from uuid import UUID
from typing import Protocol, overload
from datetime import UTC, datetime, timedelta
from src.utils import templates
from dataclasses import dataclass
from cryptography import x509
from kr8s.asyncio import Api
from importlib.resources import files
from kr8s.asyncio.objects import Secret, APIObject, Namespace, Deployment, CustomResourceDefinition, new_class, object_from_spec
from src.kubernetes.utils import apply, deployment_is_ready
from cryptography.x509.oid import NameOID, ObjectIdentifier, ExtendedKeyUsageOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa


class _KubernetesClient(Protocol):
    """Provide access to one Compute Kubernetes API."""

    async def api(self) -> Api:
        """Return the Compute Kubernetes API client."""

        ...


GatewayClassResource = new_class(
    "GatewayClass",
    "gateway.networking.k8s.io/v1",
    asyncio=True,
    namespaced=False,
    plural="gatewayclasses",
)
GatewayResource = new_class("Gateway", "gateway.networking.k8s.io/v1", asyncio=True, plural="gateways")
ClientTrafficPolicyResource = new_class(
    "ClientTrafficPolicy",
    "gateway.envoyproxy.io/v1alpha1",
    asyncio=True,
    plural="clienttrafficpolicies",
)
MutatingWebhookConfigurationResource = new_class(
    "MutatingWebhookConfiguration",
    "admissionregistration.k8s.io/v1",
    asyncio=True,
    namespaced=False,
    plural="mutatingwebhookconfigurations",
)

ENVOY_GATEWAY_VERSION = "v1.8.4"
ENVOY_GATEWAY_VERSION_ANNOTATION = "longlink.dev/envoy-gateway-version"
ENVOY_GATEWAY_IGNORED_KINDS = {
    "ValidatingAdmissionPolicy",
    "ValidatingAdmissionPolicyBinding",
}


@dataclass(slots=True)
class GatewayTLS:
    """Keep one Gateway server identity and its private certificate authority."""

    ca_certificate: str
    server_certificate: str
    server_private_key: str


@dataclass(slots=True)
class GatewayClientTLS(GatewayTLS):
    """Keep the Platform client identity issued by a Gateway certificate authority."""

    client_certificate: str
    client_private_key: str


def _gateway_tls_secret(certificate: str, private_key: str, api: Api) -> Secret:
    """Build the Kubernetes Secret for one Gateway server identity."""

    # Keep the private server identity only in the Compute cluster.
    return Secret(
        {
            "metadata": {"name": "longlink-gateway-tls", "namespace": "longlink-system"},
            "stringData": {
                "tls.crt": certificate,
                "tls.key": private_key,
            },
            "type": "kubernetes.io/tls",
        },
        api=api,
    )


def _gateway_client_ca_secret(certificate: str, api: Api) -> Secret:
    """Build the Kubernetes Secret containing the Gateway client certificate authority."""

    return Secret(
        {
            "metadata": {"name": "longlink-gateway-client-ca", "namespace": "longlink-system"},
            "stringData": {"ca.crt": certificate},
            "type": "Opaque",
        },
        api=api,
    )


def _condition_is_current(conditions: object, condition_type: str, generation: object) -> bool:
    """Return whether a Kubernetes condition is true for the current generation."""

    return isinstance(conditions, list) and isinstance(generation, int) and any(
        isinstance(condition, dict)
        and condition.get("type") == condition_type
        and condition.get("status") == "True"
        and condition.get("observedGeneration") == generation
        for condition in conditions
    )


def _leaf_certificate_builder(
    ca_name: x509.Name,
    ca_key: rsa.RSAPrivateKey,
    key: rsa.RSAPrivateKey,
    name: str,
    usage: ObjectIdentifier,
    now: datetime,
) -> x509.CertificateBuilder:
    """Build one private-CA-signed leaf certificate with its intended TLS usage."""

    # Both sides need the same validity, issuer, and non-CA key constraints.
    return (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, name)]))
        .issuer_name(ca_name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.ExtendedKeyUsage([usage]), critical=False)
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=True,
                key_cert_sign=False,
                key_agreement=False,
                content_commitment=False,
                data_encipherment=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
    )


@overload
def _generate_gateway_tls(compute_id: UUID, address: None) -> GatewayTLS: ...


@overload
def _generate_gateway_tls(compute_id: UUID, address: str) -> GatewayClientTLS: ...


def _generate_gateway_tls(compute_id: UUID, address: str | None) -> GatewayTLS | GatewayClientTLS:
    """Generate a private CA with a Gateway server identity and optional Platform client identity."""

    # Create a private CA and Gateway server identity for this Compute.
    now = datetime.now(UTC)
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, f"LongLink Compute {compute_id} CA")])
    ca_certificate = (
        x509.CertificateBuilder()
        .subject_name(ca_name)
        .issuer_name(ca_name)
        .public_key(ca_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False)
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                key_encipherment=False,
                key_cert_sign=True,
                key_agreement=False,
                content_commitment=False,
                data_encipherment=False,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(ca_key, hashes.SHA256())
    )

    # Bind the final certificate to the controller-published IP address or hostname.
    builder = _leaf_certificate_builder(
        ca_name,
        ca_key,
        server_key,
        f"LongLink Gateway {compute_id}",
        ExtendedKeyUsageOID.SERVER_AUTH,
        now,
    )
    if address is not None:
        try:
            name = x509.IPAddress(ipaddress.ip_address(address))
        except ValueError:
            name = x509.DNSName(address)
        builder = builder.add_extension(x509.SubjectAlternativeName([name]), critical=False)
    server_certificate = builder.sign(ca_key, hashes.SHA256())

    ca_pem = ca_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii")
    server_pem = server_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii")
    server_key_pem = server_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode("ascii")
    if address is None:
        return GatewayTLS(
            ca_certificate=ca_pem,
            server_certificate=server_pem,
            server_private_key=server_key_pem,
        )

    # Bind the Platform client identity to this Compute CA without exposing the CA private key.
    client_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    client_certificate = _leaf_certificate_builder(
        ca_name,
        ca_key,
        client_key,
        f"LongLink Platform {compute_id}",
        ExtendedKeyUsageOID.CLIENT_AUTH,
        now,
    ).sign(ca_key, hashes.SHA256())

    return GatewayClientTLS(
        ca_certificate=ca_pem,
        server_certificate=server_pem,
        server_private_key=server_key_pem,
        client_certificate=client_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii"),
        client_private_key=client_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode("ascii"),
    )


def generate_gateway_bootstrap_tls(compute_id: UUID) -> GatewayTLS:
    """Generate server-only TLS material used until the Gateway receives its endpoint."""

    return _generate_gateway_tls(compute_id, None)


def generate_gateway_tls(compute_id: UUID, address: str) -> GatewayClientTLS:
    """Generate endpoint-bound Gateway and Platform client TLS identities."""

    return _generate_gateway_tls(compute_id, address)


class Gateway:
    """Manage the shared Envoy Gateway API resources for one Compute."""

    def __init__(self, client: _KubernetesClient) -> None:
        """Initialize Gateway lifecycle access through the Compute Kubernetes API."""

        self._client = client

    async def _install_controller(self) -> None:
        """Install or upgrade LongLink's pinned Envoy Gateway controller."""

        # Validate ownership before mutating an existing controller installation.
        api = await self._client.api()
        deployment = Deployment("envoy-gateway", namespace="envoy-gateway-system", api=api)
        try:
            await deployment.refresh()
        except NotFoundError:
            pass
        else:
            metadata = deployment.raw.get("metadata")
            annotations = metadata.get("annotations", {}) if isinstance(metadata, dict) else {}
            if not isinstance(annotations, dict) or annotations.get(ENVOY_GATEWAY_VERSION_ANNOTATION) is None:
                raise ValueError("Envoy Gateway is not managed by LongLink")

        # Parse the complete bundled release before making any cluster changes.
        manifest_path = files("src.kubernetes.templates").joinpath(
            "platform", f"envoy-gateway-{ENVOY_GATEWAY_VERSION}.yml.gz"
        )
        manifest = gzip.decompress(manifest_path.read_bytes())
        resources: list[APIObject] = []
        certgen_job: APIObject | None = None
        for document in yaml.safe_load_all(manifest):
            if document is None:
                continue
            if not isinstance(document, dict):
                raise ValueError("Envoy Gateway manifest must contain mapping documents")
            kind = document.get("kind")
            metadata = document.get("metadata")
            if not isinstance(kind, str) or not isinstance(metadata, dict):
                raise ValueError("Envoy Gateway manifest resources require kind and metadata")
            if kind in ENVOY_GATEWAY_IGNORED_KINDS:
                continue
            if kind == "Deployment" and metadata.get("name") == "envoy-gateway":
                annotations = metadata.setdefault("annotations", {})
                if not isinstance(annotations, dict):
                    raise ValueError("Envoy Gateway Deployment annotations must be a mapping")
                annotations[ENVOY_GATEWAY_VERSION_ANNOTATION] = ENVOY_GATEWAY_VERSION
            if kind == "MutatingWebhookConfiguration":
                resource = MutatingWebhookConfigurationResource(document, api=api)
            else:
                resource = object_from_spec(document, api=api)
            resources.append(resource)
            if kind == "Job" and metadata.get("name") == "eg-gateway-helm-certgen":
                certgen_job = resource
        if certgen_job is None:
            raise ValueError("Envoy Gateway manifest did not contain the certificate generation Job")

        # Preserve dependencies that Helm hook ordering supplied in the upstream release.
        resources.sort(
            key=lambda resource: {
                "CustomResourceDefinition": 0,
                "Job": 2,
            }.get(resource.raw.get("kind"), 1)
        )

        # Apply CRDs first, wait until each API is available, then apply the remaining inventory.
        try:
            async with asyncio.timeout(5 * 60):
                for resource in resources:
                    # Recreate the Helm hook Job because Kubernetes Job pod templates are immutable.
                    if resource is certgen_job and await resource.exists():
                        try:
                            await resource.delete()
                        except NotFoundError:
                            pass
                        while await resource.exists():
                            await asyncio.sleep(1)

                    await apply(resource)
                    if isinstance(resource, CustomResourceDefinition):
                        while True:
                            await resource.refresh()
                            status = resource.raw.get("status")
                            conditions = status.get("conditions") if isinstance(status, dict) else None
                            if any(
                                isinstance(condition, dict)
                                and condition.get("type") == "Established"
                                and condition.get("status") == "True"
                                for condition in conditions or []
                            ):
                                break
                            await asyncio.sleep(1)

                # Require certificate generation and the current controller rollout.
                await certgen_job.wait(["condition=Complete", "condition=Failed"])
                status = certgen_job.raw.get("status")
                conditions = status.get("conditions", []) if isinstance(status, dict) else []
                if any(
                    isinstance(condition, dict)
                    and condition.get("type") == "Failed"
                    and condition.get("status") == "True"
                    for condition in conditions
                ):
                    raise RuntimeError("Envoy Gateway certificate generation failed")

                while True:
                    await deployment.refresh()
                    if deployment_is_ready(deployment):
                        return
                    await asyncio.sleep(5)
        except TimeoutError:
            raise RuntimeError(f"Envoy Gateway {ENVOY_GATEWAY_VERSION} did not become ready") from None

    async def apply(self, tls: GatewayTLS | None = None) -> str:
        """Apply the shared Gateway and wait for its authenticated endpoint."""

        # Every registered kubeconfig gets the controller before LongLink creates Gateway API resources.
        await self._install_controller()

        # Render LongLink resources that target the required Envoy Gateway controller.
        namespace, gateway_class, gateway, client_traffic_policy = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("platform", "gateway.yml")
        )
        api = await self._client.api()
        gateway_class_resource = GatewayClassResource(gateway_class, api=api)
        gateway_resource = GatewayResource(gateway, api=api)
        policy_resource = ClientTrafficPolicyResource(client_traffic_policy, api=api)
        await apply(Namespace(namespace, api=api))
        await apply(gateway_class_resource)

        # Wait for Envoy Gateway to accept LongLink's class before creating dependent resources.
        try:
            async with asyncio.timeout(2 * 60):
                while True:
                    await gateway_class_resource.refresh()
                    status = gateway_class_resource.raw.get("status")
                    conditions = status.get("conditions", []) if isinstance(status, dict) else []
                    if _condition_is_current(conditions, "Accepted", gateway_class_resource.metadata.get("generation")):
                        break
                    await asyncio.sleep(5)
        except TimeoutError:
            raise RuntimeError("Envoy Gateway did not accept GatewayClass longlink-envoy") from None

        if tls is not None:
            await apply(_gateway_tls_secret(tls.server_certificate, tls.server_private_key, api))
            await apply(_gateway_client_ca_secret(tls.ca_certificate, api))
        await apply(policy_resource)
        await apply(gateway_resource)

        # Require the controller, Gateway, policy, and external address before publishing readiness.
        try:
            async with asyncio.timeout(5 * 60):
                while True:
                    await gateway_resource.refresh()
                    await policy_resource.refresh()
                    gateway_status = gateway_resource.raw.get("status")
                    gateway_conditions = gateway_status.get("conditions", []) if isinstance(gateway_status, dict) else []
                    listeners = gateway_status.get("listeners", []) if isinstance(gateway_status, dict) else []
                    addresses = gateway_status.get("addresses", []) if isinstance(gateway_status, dict) else []
                    gateway_generation = gateway_resource.metadata.get("generation")
                    programmed = _condition_is_current(gateway_conditions, "Programmed", gateway_generation)
                    listener_ready = any(
                        listener.get("name") == "https"
                        and all(
                            _condition_is_current(listener.get("conditions"), condition_type, gateway_generation)
                            for condition_type in ("Accepted", "Programmed", "ResolvedRefs")
                        )
                        for listener in listeners
                        if isinstance(listener, dict)
                    )

                    policy_status = policy_resource.raw.get("status")
                    ancestors = policy_status.get("ancestors", []) if isinstance(policy_status, dict) else []
                    policy_generation = policy_resource.metadata.get("generation")
                    authenticated = any(
                        ancestor.get("controllerName") == "gateway.envoyproxy.io/gatewayclass-controller"
                        and isinstance(ancestor.get("ancestorRef"), dict)
                        and ancestor["ancestorRef"].get("name") == "longlink"
                        and ancestor["ancestorRef"].get("namespace") == "longlink-system"
                        and _condition_is_current(ancestor.get("conditions"), "Accepted", policy_generation)
                        for ancestor in ancestors
                        if isinstance(ancestor, dict)
                    )
                    if programmed and listener_ready and authenticated:
                        for address in addresses:
                            value = address.get("value") if isinstance(address, dict) else None
                            if isinstance(value, str) and value:
                                return value
                    await asyncio.sleep(5)
        except TimeoutError:
            raise RuntimeError("LongLink Gateway did not become ready") from None

    async def replace_tls(self, tls: GatewayTLS) -> None:
        """Replace Gateway TLS identities after endpoint allocation."""

        # Envoy Gateway watches these Secrets and reloads the final mTLS configuration.
        api = await self._client.api()
        await apply(_gateway_tls_secret(tls.server_certificate, tls.server_private_key, api))
        await apply(_gateway_client_ca_secret(tls.ca_certificate, api))

    async def delete(self) -> None:
        """Delete the cluster-scoped LongLink GatewayClass and wait for completion."""

        # Issue deletion once and wait for GatewayClass finalizers to complete.
        try:
            async with asyncio.timeout(10 * 60):
                gateway_class = GatewayClassResource("longlink-envoy", api=await self._client.api())
                await gateway_class.delete()
                await gateway_class.wait("delete")
        except NotFoundError:
            return
        except TimeoutError:
            raise RuntimeError("Kubernetes GatewayClass did not terminate: longlink-envoy") from None
