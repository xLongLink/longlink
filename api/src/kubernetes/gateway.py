import httpx2
import asyncio
import hashlib
import tempfile
import ipaddress
from kr8s import ServerError
from uuid import UUID
from typing import TYPE_CHECKING
from datetime import UTC, datetime, timedelta
from src.utils import templates
from dataclasses import dataclass
from cryptography import x509
from kr8s.asyncio import Api
from importlib.resources import files
from kr8s.asyncio.objects import Secret, Namespace, new_class, objects_from_files
from src.kubernetes.utils import apply
from cryptography.x509.oid import NameOID, ObjectIdentifier, ExtendedKeyUsageOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

GatewayClassResource = new_class(
    "GatewayClass",
    "gateway.networking.k8s.io/v1",
    asyncio=True,
    namespaced=False,
    plural="gatewayclasses",
)


@dataclass(slots=True)
class GatewayTLS:
    """Keep the Gateway server and Platform client identities issued by one private CA."""

    ca_certificate: str
    server_certificate: str
    server_private_key: str
    client_certificate: str
    client_private_key: str


def gateway_tls_secret(certificate: str, private_key: str, api: Api) -> Secret:
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


def gateway_client_ca_secret(certificate: str, api: Api) -> Secret:
    """Build the Kubernetes Secret containing the Gateway client certificate authority."""

    return Secret(
        {
            "metadata": {"name": "longlink-gateway-client-ca", "namespace": "longlink-system"},
            "stringData": {"ca.crt": certificate},
            "type": "Opaque",
        },
        api=api,
    )


def leaf_certificate_builder(
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


def generate_gateway_tls(compute_id: UUID, address: str | None) -> GatewayTLS:
    """Generate a private CA with Gateway server and Platform client identities."""

    # Create a private CA and independent server and client identities for this Compute.
    now = datetime.now(UTC)
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    client_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
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
    builder = leaf_certificate_builder(
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

    # Bind the Platform client identity to this Compute CA without exposing the CA private key.
    client_certificate = leaf_certificate_builder(
        ca_name,
        ca_key,
        client_key,
        f"LongLink Platform {compute_id}",
        ExtendedKeyUsageOID.CLIENT_AUTH,
        now,
    ).sign(ca_key, hashes.SHA256())

    return GatewayTLS(
        ca_certificate=ca_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii"),
        server_certificate=server_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii"),
        server_private_key=server_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode("ascii"),
        client_certificate=client_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii"),
        client_private_key=client_key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode("ascii"),
    )


class Gateway:
    """Manage the shared Envoy Gateway API resources for one Compute."""

    def __init__(self, client: "Kubernetes") -> None:
        """Initialize Gateway lifecycle access through the Compute Kubernetes API."""

        self._client = client

    async def install_controller(self) -> None:
        """Install the Envoy Gateway controller required by every Compute."""

        # Reuse a controller that has already accepted LongLink's GatewayClass.
        api = await self._client.api()
        gateway_class = GatewayClassResource("longlink-envoy", api=api)
        try:
            if await gateway_class.exists():
                await gateway_class.refresh()
                status = gateway_class.raw.get("status")
                conditions = status.get("conditions", []) if isinstance(status, dict) else []
                if any(
                    isinstance(condition, dict) and condition.get("type") == "Accepted" and condition.get("status") == "True"
                    for condition in conditions
                ):
                    return
        except ServerError as exc:
            if exc.response is None or exc.response.status_code != 404:
                raise

        # Verify the pinned upstream manifest before applying its CRDs and controller resources.
        async with httpx2.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            response = await client.get("https://github.com/envoyproxy/gateway/releases/download/v1.8.3/install.yaml")
            response.raise_for_status()
        manifest = response.content
        if hashlib.sha256(manifest).hexdigest() != "37a62afe9bb07d87e86c5c2cff32f046f17397cb4fca9f2a741165826212d781":
            raise ValueError("Envoy Gateway v1.8.3 manifest checksum does not match")

        # kr8s loads multi-document manifests from a file while retaining the Compute API connection.
        with tempfile.NamedTemporaryFile() as manifest_file:
            manifest_file.write(manifest)
            manifest_file.flush()
            resources = await objects_from_files(manifest_file.name, api=api)
            for resource in resources:
                # LongLink-generated resources do not need Envoy's optional admission policies or webhooks.
                if resource.raw.get("kind") in {
                    "MutatingWebhookConfiguration",
                    "ValidatingAdmissionPolicy",
                    "ValidatingAdmissionPolicyBinding",
                    "ValidatingWebhookConfiguration",
                }:
                    continue
                try:
                    async with asyncio.timeout(30):
                        await apply(resource)
                except TimeoutError:
                    metadata = resource.raw.get("metadata")
                    name = metadata.get("name", "unknown") if isinstance(metadata, dict) else "unknown"
                    raise RuntimeError(f"Timed out applying Envoy Gateway {resource.raw.get('kind', 'resource')}/{name}") from None

    async def apply(self, tls: GatewayTLS | None = None) -> str:
        """Apply the shared Gateway and wait for its authenticated endpoint."""

        # Every registered kubeconfig gets the controller before LongLink creates Gateway API resources.
        await self.install_controller()

        # Render LongLink resources that target the required Envoy Gateway controller.
        namespace, gateway_class, gateway, client_traffic_policy = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("platform", "gateway.yml")
        )
        api = await self._client.api()
        gateway_resource = new_class("Gateway", "gateway.networking.k8s.io/v1", asyncio=True, plural="gateways")(gateway, api=api)
        policy_resource = new_class(
            "ClientTrafficPolicy",
            "gateway.envoyproxy.io/v1alpha1",
            asyncio=True,
            plural="clienttrafficpolicies",
        )(client_traffic_policy, api=api)
        await apply(Namespace(namespace, api=api))
        await apply(GatewayClassResource(gateway_class, api=api))
        if tls is not None:
            await apply(gateway_tls_secret(tls.server_certificate, tls.server_private_key, api))
            await apply(gateway_client_ca_secret(tls.ca_certificate, api))
        await apply(gateway_resource)
        await apply(policy_resource)

        # Require the controller, Gateway, policy, and external address before publishing readiness.
        while True:
            await gateway_resource.refresh()
            await policy_resource.refresh()
            gateway_status = gateway_resource.raw.get("status")
            gateway_conditions = gateway_status.get("conditions", []) if isinstance(gateway_status, dict) else []
            addresses = gateway_status.get("addresses", []) if isinstance(gateway_status, dict) else []
            policy_status = policy_resource.raw.get("status")
            ancestors = policy_status.get("ancestors", []) if isinstance(policy_status, dict) else []
            programmed = any(
                isinstance(condition, dict) and condition.get("type") == "Programmed" and condition.get("status") == "True"
                for condition in gateway_conditions
            )
            authenticated = any(
                condition.get("type") == "Accepted" and condition.get("status") == "True"
                for ancestor in ancestors
                if isinstance(ancestor, dict)
                for condition in ancestor.get("conditions", [])
                if isinstance(condition, dict)
            )
            if programmed and authenticated and isinstance(addresses, list):
                for address in addresses:
                    value = address.get("value") if isinstance(address, dict) else None
                    if isinstance(value, str) and value:
                        return value
            await asyncio.sleep(5)

    async def replace_tls(self, tls: GatewayTLS, address: str) -> None:
        """Replace Gateway TLS identities after endpoint allocation."""

        # Envoy Gateway watches these Secrets and reloads the final mTLS configuration.
        api = await self._client.api()
        await apply(gateway_tls_secret(tls.server_certificate, tls.server_private_key, api))
        await apply(gateway_client_ca_secret(tls.ca_certificate, api))

    async def delete(self) -> None:
        """Delete the cluster-scoped LongLink GatewayClass and wait for completion."""

        # Issue deletion once and then poll only the GatewayClass state.
        try:
            async with asyncio.timeout(10 * 60):
                gateway_class = GatewayClassResource("longlink-envoy", api=await self._client.api())
                while await gateway_class.exists():
                    await gateway_class.refresh()
                    if gateway_class.metadata.get("deletionTimestamp") is None:
                        await gateway_class.delete()
                    await asyncio.sleep(5)
        except TimeoutError:
            raise RuntimeError("Kubernetes GatewayClass did not terminate: longlink-envoy") from None
