import json
import yaml
import asyncio
import hashlib
import ipaddress
from uuid import UUID
from typing import TYPE_CHECKING
from datetime import UTC, datetime, timedelta
from src.utils import templates
from dataclasses import dataclass
from cryptography import x509
from importlib.resources import files
from src.models.gateways import APPLICATION_ID_HEADER
from kr8s.asyncio.objects import Secret, Service, ConfigMap, Namespace, Deployment, NetworkPolicy
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from src.kubernetes.client import deployment_is_ready
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes

PLATFORM_TEMPLATES = files("src.kubernetes.templates").joinpath("platform")

KubernetesDocument = dict[str, object]
EnvoyDocument = dict[str, object]


@dataclass(frozen=True, slots=True)
class GatewayRoute:
    """Describe one Application Service route without carrying workload configuration."""

    id: UUID
    namespace: str


@dataclass(frozen=True, slots=True)
class GatewayTLSMaterial:
    """Carry the immutable per-compute CA certificate, certificate, and private key."""

    ca_certificate: str
    certificate: str
    private_key: str


def render_envoy_config(desired_routes: tuple[GatewayRoute, ...]) -> str:
    """Render deterministic authenticated Envoy routes from the authoritative route snapshot."""

    # Every Application gets one authenticated route and one DNS-backed cluster.
    routes: list[EnvoyDocument] = []
    clusters: list[EnvoyDocument] = []
    for route in sorted(desired_routes, key=lambda item: (item.namespace, str(item.id))):
        application_id = str(route.id)
        cluster_name = f"{route.namespace}-{application_id}"
        application_id_match: EnvoyDocument = {
            "name": APPLICATION_ID_HEADER,
            "string_match": {"exact": application_id},
        }
        routes.append(
            {
                "match": {
                    "prefix": "/",
                    "headers": [application_id_match],
                },
                "route": {
                    "cluster": cluster_name,
                    "timeout": "300s",
                },
                "request_headers_to_remove": [APPLICATION_ID_HEADER],
            }
        )
        clusters.append(
            {
                "name": cluster_name,
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
                                                "address": f"app-{application_id}.{route.namespace}.svc",
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

    # Health checks bypass authentication before the desired Application routes.
    config = templates.readyml_list(
        PLATFORM_TEMPLATES.joinpath("envoy.yml"),
        routes=json.dumps(
            [
                {
                    "match": {"path": "/ready"},
                    "direct_response": {"status": 200},
                },
                *routes,
            ],
            separators=(",", ":"),
        ),
        clusters=json.dumps(clusters, separators=(",", ":")),
    )[0]
    return yaml.safe_dump(config, sort_keys=False)


def generate_gateway_tls(compute_id: UUID, address: ipaddress.IPv4Address | ipaddress.IPv6Address) -> GatewayTLSMaterial:
    """Generate the immutable TLS identity for a newly provisioned compute gateway."""

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
                encipher_only=False,
                decipher_only=False,
            ),
            critical=True,
        )
        .sign(ca_key, hashes.SHA256())
    )

    # MVP KaaS providers expose an IP address, which HTTPS clients require as an IP SAN.
    server_certificate = (
        x509.CertificateBuilder()
        .subject_name(server_name)
        .issuer_name(ca_name)
        .public_key(server_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=5))
        .not_valid_after(now + timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(x509.SubjectAlternativeName([x509.IPAddress(address)]), critical=False)
        .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.CLIENT_AUTH, ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
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


def render_gateway_manifests(tls: GatewayTLSMaterial, envoy_config: str) -> tuple[KubernetesDocument, KubernetesDocument, KubernetesDocument]:
    """Render gateway runtime resources under one Pod revision."""

    # Roll Pods only when mounted runtime content changes.
    runtime_revision = hashlib.sha256(
        json.dumps(
            {
                "certificate": tls.certificate,
                "envoy_config": envoy_config,
                "private_key": tls.private_key,
            },
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()
    manifests = templates.readyml_list(
        PLATFORM_TEMPLATES.joinpath("gateway.yml"),
        envoy_config=json.dumps(envoy_config),
        runtime_revision=runtime_revision,
    )
    return manifests[0], manifests[1], manifests[2]


class Gateway:
    """Manage the compute gateway endpoint and runtime resources."""

    def __init__(self, client: "Kubernetes") -> None:
        """Initialize gateway lifecycle access through shared cluster resources."""

        self._client = client

    async def ip(self) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
        """Apply gateway endpoint resources and wait for the allocated IP."""

        # Establish the system Namespace before asking the provider for a public LoadBalancer endpoint.
        namespace, service_manifest = templates.readyml_list(PLATFORM_TEMPLATES.joinpath("bootstrap.yml"))
        api = await self._client.api()
        namespace_resource = Namespace(namespace, api=api)
        if await namespace_resource.exists():
            await namespace_resource.patch(namespace)
        else:
            await namespace_resource.create()
        service_resource = Service(service_manifest, api=api)
        if await service_resource.exists():
            await service_resource.patch(service_manifest)
        else:
            await service_resource.create()

        # Poll provider-owned Service status without repeatedly applying unchanged desired state.
        while True:
            service = Service("longlink-gateway", namespace="longlink-system", api=api)
            if not await service.exists():
                raise RuntimeError("Gateway Service disappeared before IP allocation")
            await service.refresh()

            # Parse the provider-owned Service status while endpoint allocation is pending.
            body = service.raw
            status = body.get("status", {}) if isinstance(body, dict) else {}
            load_balancer = status.get("loadBalancer", {}) if isinstance(status, dict) else {}
            ingress = load_balancer.get("ingress", []) if isinstance(load_balancer, dict) else []
            if not isinstance(ingress, list):
                raise TypeError("Gateway LoadBalancer ingress must be a list")
            for entry in ingress:
                if not isinstance(entry, dict):
                    raise TypeError("Gateway LoadBalancer ingress entries must be mappings")
                value = entry.get("ip")
                if isinstance(value, str) and value.strip():
                    return ipaddress.ip_address(value.strip())
            if ingress:
                raise ValueError("Gateway LoadBalancer must publish an IP address")
            await asyncio.sleep(5)

    async def apply(self, routes: tuple[GatewayRoute, ...], tls: GatewayTLSMaterial) -> None:
        """Apply the desired gateway runtime and wait for its Deployment rollout."""

        # Render the complete runtime before changing any gateway dependency.
        config_map, deployment_manifest, network_policy = render_gateway_manifests(tls, render_envoy_config(routes))

        # Install every Pod dependency and its ingress policy before updating the Deployment.
        api = await self._client.api()
        tls_secret = Secret(
            {
                "metadata": {"name": "longlink-gateway-tls", "namespace": "longlink-system"},
                "stringData": {"ca.crt": tls.ca_certificate, "tls.crt": tls.certificate, "tls.key": tls.private_key},
                "type": "kubernetes.io/tls",
            },
            api=api,
        )
        if await tls_secret.exists():
            await tls_secret.patch({"stringData": {"tls.crt": tls.certificate, "tls.key": tls.private_key}})
        else:
            await tls_secret.create()
        config = ConfigMap(config_map, api=api)
        if await config.exists():
            await config.patch(config_map)
        else:
            await config.create()
        policy = NetworkPolicy(network_policy, api=api)
        if await policy.exists():
            await policy.patch(network_policy)
        else:
            await policy.create()
        deployment = Deployment(deployment_manifest, api=api)
        if await deployment.exists():
            await deployment.patch(deployment_manifest)
        else:
            await deployment.create()

        # Poll rollout status without repeatedly applying the same Deployment revision.
        while True:
            deployment = Deployment("longlink-gateway", namespace="longlink-system", api=api)
            if not await deployment.exists():
                raise RuntimeError("Gateway Deployment disappeared during rollout")
            await deployment.refresh()
            if deployment_is_ready(deployment):
                return
            await asyncio.sleep(5)
