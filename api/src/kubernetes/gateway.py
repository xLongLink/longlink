import ssl
import asyncio
import ipaddress
from uuid import UUID
from typing import TYPE_CHECKING
from datetime import UTC, datetime, timedelta
from src.utils import templates
from cryptography import x509
from kr8s.asyncio import Api
from importlib.resources import files
from kr8s.asyncio.objects import Secret, Namespace, new_class
from src.kubernetes.utils import apply
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
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
GatewayResource = new_class("Gateway", "gateway.networking.k8s.io/v1", asyncio=True, plural="gateways")
SecurityPolicyResource = new_class(
    "SecurityPolicy",
    "gateway.envoyproxy.io/v1alpha1",
    asyncio=True,
    plural="securitypolicies",
)


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


def generate_gateway_tls(
    compute_id: UUID,
    address: ipaddress.IPv4Address | ipaddress.IPv6Address | str | None,
) -> tuple[str, str, str]:
    """Generate one private CA and its Gateway server certificate."""

    # Create a private CA and a server-only identity for this Compute Gateway.
    now = datetime.now(UTC)
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, f"LongLink Compute {compute_id} CA")])
    server_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, f"LongLink Gateway {compute_id}")])
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
    builder = (
        x509.CertificateBuilder()
        .subject_name(server_name)
        .issuer_name(ca_name)
        .public_key(server_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(server_key.public_key()), critical=False)
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
    if address is not None:
        if isinstance(address, str):
            try:
                name: x509.GeneralName = x509.IPAddress(ipaddress.ip_address(address))
            except ValueError:
                name = x509.DNSName(address)
        else:
            name = x509.IPAddress(address)
        builder = builder.add_extension(x509.SubjectAlternativeName([name]), critical=False)
    server_certificate = builder.sign(ca_key, hashes.SHA256())

    return (
        ca_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii"),
        server_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii"),
        server_key.private_bytes(
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

    async def apply(self, certificate: str, private_key: str, api_key: str) -> str:
        """Apply the shared Gateway and wait for its authenticated endpoint."""

        # Render LongLink resources that target the required Envoy Gateway controller.
        namespace, gateway_class, gateway, security_policy = templates.readyml_list(
            files("src.kubernetes.templates").joinpath("platform", "gateway.yml")
        )
        api = await self._client.api()
        resources = [
            Namespace(namespace, api=api),
            GatewayClassResource(gateway_class, api=api),
            gateway_tls_secret(certificate, private_key, api),
            Secret(
                {
                    "metadata": {"name": "longlink-gateway-api-key", "namespace": "longlink-system"},
                    "stringData": {"platform": api_key},
                    "type": "Opaque",
                },
                api=api,
            ),
            GatewayResource(gateway, api=api),
            SecurityPolicyResource(security_policy, api=api),
        ]
        for resource in resources:
            await apply(resource)

        # Require the controller, Gateway, policy, and external address before publishing readiness.
        gateway_resource = resources[-2]
        policy_resource = resources[-1]
        while True:
            await gateway_resource.refresh()
            await policy_resource.refresh()
            gateway_status = gateway_resource.raw.get("status")
            gateway_conditions = gateway_status.get("conditions", []) if isinstance(gateway_status, dict) else []
            addresses = gateway_status.get("addresses", []) if isinstance(gateway_status, dict) else []
            policy_status = policy_resource.raw.get("status")
            ancestors = policy_status.get("ancestors", []) if isinstance(policy_status, dict) else []
            policy_conditions = [
                condition
                for ancestor in ancestors
                if isinstance(ancestor, dict)
                for condition in ancestor.get("conditions", [])
                if isinstance(condition, dict)
            ]
            programmed = any(
                isinstance(condition, dict) and condition.get("type") == "Programmed" and condition.get("status") == "True"
                for condition in gateway_conditions
            )
            authenticated = any(
                condition.get("type") == "Accepted" and condition.get("status") == "True" for condition in policy_conditions
            )
            if programmed and authenticated and isinstance(addresses, list):
                for address in addresses:
                    value = address.get("value") if isinstance(address, dict) else None
                    if isinstance(value, str) and value:
                        return value
            await asyncio.sleep(5)

    async def replace_tls(self, certificate: str, private_key: str, gateway_certificate: str, address: str) -> None:
        """Replace the Gateway server certificate after endpoint allocation."""

        # Envoy Gateway watches its listener Secret and reloads the final address-bound identity.
        api = await self._client.api()
        await apply(gateway_tls_secret(certificate, private_key, api))

        # Do not publish the Compute until Envoy serves the final address-bound certificate.
        context = ssl.create_default_context(cadata=gateway_certificate)
        while True:
            try:
                _, writer = await asyncio.open_connection(address, 443, ssl=context, server_hostname=address)
            except (OSError, ssl.SSLError):
                await asyncio.sleep(5)
                continue
            writer.close()
            await writer.wait_closed()
            return

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
