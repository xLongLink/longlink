import hmac
import json
import yaml
import hashlib
import ipaddress
from io import StringIO
from typing import TYPE_CHECKING, Any
from datetime import UTC, datetime, timedelta
from src.utils import templates
from dataclasses import dataclass
from cryptography import x509
from importlib.resources import files
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from cryptography.exceptions import UnsupportedAlgorithm
from src.kubernetes.resources import KubernetesDocument
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

if TYPE_CHECKING:
    from src.kubernetes.reconcile import DesiredApplication

TEMPLATES = files("src.kubernetes.templates")
TEMPLATE_REVISION = "2026-07-24.1"
GATEWAY_NAME = "longlink-gateway"
GATEWAY_NAMESPACE = "longlink-system"
GATEWAY_AUTH_SECRET_NAME = "longlink-gateway-auth"
GATEWAY_TLS_SECRET_NAME = "longlink-gateway-tls"

EnvoyDocument = dict[str, Any]


@dataclass(frozen=True, slots=True)
class GatewayTLSMaterial:
    """Carry the per-compute CA certificate, server certificate, and sensitive private key used by the public gateway.

    Reconciliation persists and stages this identity before deployment when rotation changes its trust chain.
    """

    ca_certificate: str
    certificate: str
    private_key: str


@dataclass(frozen=True, slots=True)
class GatewayManifests:
    """Hold ordered gateway manifests with exact Secrets identified explicitly."""

    auth_secret: KubernetesDocument
    tls_secret: KubernetesDocument
    config_map: KubernetesDocument
    deployment: KubernetesDocument
    service: KubernetesDocument
    network_policy: KubernetesDocument
    runtime_revision: str


class Gateway:
    """Render the compute gateway boundary for public TLS termination and authenticated application routing.

    Routing inputs come from desired state rather than cluster discovery.
    """

    def system_namespace(self, compute_id: str, platform_version: str) -> KubernetesDocument:
        """Render the exclusively claimed LongLink system Namespace."""

        # Hash the source so edits to namespace metadata are visible in desired state.
        source = TEMPLATES.joinpath("system_namespace.yml")
        runtime_revision = hashlib.sha256(source.read_bytes()).hexdigest()
        return templates.readyml_list(
            source,
            compute_id=compute_id,
            platform_version=platform_version,
            runtime_revision=runtime_revision,
            template_revision=TEMPLATE_REVISION,
        )[0]

    def service(self, compute_id: str, runtime_revision: str, platform_version: str) -> KubernetesDocument:
        """Render the stable public LoadBalancer Service that establishes the compute endpoint.

        Reconciliation applies it before TLS generation because the endpoint determines the certificate SAN.
        """

        return templates.readyml_list(
            TEMPLATES.joinpath("gateway_service.yml"),
            compute_id=compute_id,
            platform_version=platform_version,
            runtime_revision=runtime_revision,
            template_revision=TEMPLATE_REVISION,
        )[0]

    def initial_service_revision(self) -> str:
        """Return a deterministic revision for the service applied before endpoint discovery."""

        return hashlib.sha256(TEMPLATES.joinpath("gateway_service.yml").read_bytes()).hexdigest()

    def config(self, applications: "tuple[DesiredApplication, ...]") -> str:
        """Render deterministic authenticated Envoy routes from the authoritative application snapshot.

        Omitted applications receive no route even if stale Services still exist.
        """

        # Every application gets one authenticated route and one DNS-backed cluster.
        routes: list[EnvoyDocument] = []
        clusters: list[EnvoyDocument] = []
        gateway_secret_match: EnvoyDocument = {
            "name": "x-longlink-gateway-secret",
            "string_match": {"exact": "__LONG_LINK_GATEWAY_SECRET__"},
        }
        for application in sorted(applications, key=lambda item: (item.namespace, str(item.id))):
            application_id = str(application.id)
            service_name = f"app-{application_id}"
            cluster_name = f"{application.namespace}-{application_id}"
            application_id_match: EnvoyDocument = {
                "name": "x-longlink-application-id",
                "string_match": {"exact": application_id},
            }
            routes.append(
                {
                    "match": {
                        "prefix": "/",
                        "headers": [gateway_secret_match, application_id_match],
                    },
                    "route": {
                        "cluster": cluster_name,
                        "timeout": "300s",
                    },
                    "request_headers_to_remove": ["x-longlink-gateway-secret", "x-longlink-application-id"],
                }
            )
            clusters.append(
                {
                    "name": cluster_name,
                    "connect_timeout": "5s",
                    "type": "STRICT_DNS",
                    "load_assignment": {
                        "cluster_name": cluster_name,
                        "endpoints": [
                            {
                                "lb_endpoints": [
                                    {
                                        "endpoint": {
                                            "address": {
                                                "socket_address": {
                                                    "address": f"{service_name}.{application.namespace}.svc",
                                                    "port_value": 8000,
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        ],
                    },
                }
            )

        # Health and fallback routes surround the desired application routes.
        rendered_routes: list[EnvoyDocument] = [
            {
                "match": {"path": "/ready"},
                "direct_response": {"status": 200, "body": {"inline_string": "ready"}},
            },
            *routes,
            {
                "match": {"prefix": "/"},
                "direct_response": {"status": 404, "body": {"inline_string": "Not found"}},
            },
        ]
        config = templates.readyml_list(
            TEMPLATES.joinpath("envoy.yml"),
            routes=json.dumps(rendered_routes, separators=(",", ":")),
            clusters=json.dumps(clusters, separators=(",", ":")),
        )[0]
        stream = StringIO()
        yaml.safe_dump(config, stream=stream, sort_keys=False)
        return stream.getvalue()

    def tls(self, compute_id: str, endpoint: str, existing: GatewayTLSMaterial | None = None) -> GatewayTLSMaterial:
        """Reuse persisted TLS only after validating its compute identity, key, chain, lifetime, and endpoint SAN.

        Otherwise generate a per-compute CA and server certificate for the caller to stage before deployment.
        """

        # Existing material is reusable only when its chain, key, compute identity, lifetime, and SAN all remain valid.
        if existing is not None and self._valid_tls(compute_id, endpoint, existing):
            return existing

        # A new endpoint identity uses a private self-signed CA and a CA-issued server certificate.
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
                    encipher_only=None,  # pyright: ignore[reportArgumentType]
                    decipher_only=None,  # pyright: ignore[reportArgumentType]
                ),
                critical=True,
            )
            .sign(ca_key, hashes.SHA256())
        )

        # The load-balancer address determines whether the server certificate needs an IP or DNS SAN.
        try:
            subject_name: x509.GeneralName = x509.IPAddress(ipaddress.ip_address(endpoint))
        except ValueError:
            subject_name = x509.DNSName(endpoint)
        server_certificate = (
            x509.CertificateBuilder()
            .subject_name(server_name)
            .issuer_name(ca_name)
            .public_key(server_key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - timedelta(minutes=5))
            .not_valid_after(now + timedelta(days=365))
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            .add_extension(x509.SubjectAlternativeName([subject_name]), critical=False)
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
                    encipher_only=None,  # pyright: ignore[reportArgumentType]
                    decipher_only=None,  # pyright: ignore[reportArgumentType]
                ),
                critical=True,
            )
            .sign(ca_key, hashes.SHA256())
        )
        return GatewayTLSMaterial(
            ca_certificate=ca_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii"),
            certificate=server_certificate.public_bytes(serialization.Encoding.PEM).decode("ascii"),
            private_key=server_key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            ).decode("ascii"),
        )

    def manifests(
        self,
        compute_id: str,
        proxy_secret: str,
        tls: GatewayTLSMaterial,
        envoy_config: str,
        platform_version: str,
    ) -> GatewayManifests:
        """Render exact gateway Secrets and applied resources under one revision derived from behavior and secret inputs.

        Exact Secret replacement removes omitted keys, while revision annotations roll Pods when trust, auth, or config changes.
        """

        # Hash rendered behavior and secret material so every relevant change rolls the gateway pods.
        sources = "".join(
            TEMPLATES.joinpath(name).read_text(encoding="utf-8") for name in ("envoy.yml", "gateway.yml", "gateway_service.yml")
        )
        revision_input = json.dumps(
            {
                "ca_certificate": tls.ca_certificate,
                "certificate": tls.certificate,
                "envoy_config": envoy_config,
                "private_key": tls.private_key,
                "proxy_secret": proxy_secret,
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        runtime_revision = hmac.new(
            proxy_secret.encode("utf-8"),
            f"{sources}\n{revision_input}".encode(),
            hashlib.sha256,
        ).hexdigest()
        manifests = templates.readyml_list(
            TEMPLATES.joinpath("gateway.yml"),
            ca_certificate=json.dumps(tls.ca_certificate),
            envoy_config=json.dumps(envoy_config),
            gateway_secret=json.dumps(proxy_secret),
            compute_id=compute_id,
            platform_version=platform_version,
            runtime_revision=runtime_revision,
            template_revision=TEMPLATE_REVISION,
            tls_certificate=json.dumps(tls.certificate),
            tls_private_key=json.dumps(tls.private_key),
        )

        # Template order is an internal contract because Secrets require exact replacement.
        expected_kinds = ("Secret", "Secret", "ConfigMap", "Deployment", "NetworkPolicy")
        if tuple(manifest.get("kind") for manifest in manifests) != expected_kinds:
            raise ValueError("Gateway template resources are incomplete or out of order")
        return GatewayManifests(
            auth_secret=manifests[0],
            tls_secret=manifests[1],
            config_map=manifests[2],
            deployment=manifests[3],
            service=self.service(compute_id, runtime_revision, platform_version),
            network_policy=manifests[4],
            runtime_revision=runtime_revision,
        )

    def _valid_tls(self, compute_id: str, endpoint: str, material: GatewayTLSMaterial) -> bool:
        """Return whether persisted PEM material is valid for this compute target and endpoint."""

        # PEM parsing is an untrusted persistence boundary, so malformed material requests rotation.
        try:
            ca_certificate = x509.load_pem_x509_certificate(material.ca_certificate.encode("ascii"))
            server_certificate = x509.load_pem_x509_certificate(material.certificate.encode("ascii"))
            private_key = serialization.load_pem_private_key(material.private_key.encode("ascii"), password=None)
            ca_constraints = ca_certificate.extensions.get_extension_for_class(x509.BasicConstraints).value
            server_constraints = server_certificate.extensions.get_extension_for_class(x509.BasicConstraints).value
            ca_key_identifier = ca_certificate.extensions.get_extension_for_class(x509.SubjectKeyIdentifier).value
            ca_authority = ca_certificate.extensions.get_extension_for_class(x509.AuthorityKeyIdentifier).value
            server_authority = server_certificate.extensions.get_extension_for_class(x509.AuthorityKeyIdentifier).value
            usages = server_certificate.extensions.get_extension_for_class(x509.ExtendedKeyUsage).value
            subject_names = server_certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
            ca_certificate.verify_directly_issued_by(ca_certificate)
            server_certificate.verify_directly_issued_by(ca_certificate)
        except (TypeError, ValueError, UnsupportedAlgorithm, x509.ExtensionNotFound, UnicodeEncodeError):
            return False

        # Certificates near expiry rotate while there is still time to persist and deploy replacements.
        now = datetime.now(UTC)
        minimum_expiry = now + timedelta(days=30)
        if (
            ca_certificate.not_valid_before_utc > now
            or ca_certificate.not_valid_after_utc <= minimum_expiry
            or server_certificate.not_valid_before_utc > now
            or server_certificate.not_valid_after_utc <= minimum_expiry
        ):
            return False

        # Persisted material must be the expected per-compute chain and a server-auth certificate.
        expected_ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, f"LongLink Compute {compute_id} CA")])
        expected_server_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, f"LongLink Gateway {compute_id}")])
        if (
            ca_certificate.subject != expected_ca_name
            or ca_certificate.issuer != expected_ca_name
            or server_certificate.subject != expected_server_name
            or not ca_constraints.ca
            or server_constraints.ca
            or ca_authority.key_identifier != ca_key_identifier.digest
            or server_authority.key_identifier != ca_key_identifier.digest
            or ExtendedKeyUsageOID.SERVER_AUTH not in usages
        ):
            return False

        # The private key must match the server certificate public key.
        private_public_key = private_key.public_key().public_bytes(
            serialization.Encoding.DER,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        certificate_public_key = server_certificate.public_key().public_bytes(
            serialization.Encoding.DER,
            serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        if private_public_key != certificate_public_key:
            return False

        # Match the endpoint against the SAN type clients will use for HTTPS validation.
        try:
            address = ipaddress.ip_address(endpoint)
        except ValueError:
            return endpoint in subject_names.get_values_for_type(x509.DNSName)
        return address in subject_names.get_values_for_type(x509.IPAddress)
