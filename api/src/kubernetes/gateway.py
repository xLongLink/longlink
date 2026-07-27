import hmac
import json
import time
import yaml
import asyncio
import hashlib
import ipaddress
from io import StringIO
from uuid import UUID
from typing import Any
from datetime import UTC, datetime, timedelta
from src.utils import templates
from dataclasses import dataclass
from cryptography import x509
from importlib.resources import files
from kr8s.asyncio.objects import Service, Namespace, Deployment
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from src.kubernetes.resources import KubernetesDocument, KubernetesResources
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa

PLATFORM_TEMPLATES = files("src.kubernetes.templates").joinpath("platform")
GATEWAY_NAMESPACE = "longlink-system"
RESOURCE_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2

EnvoyDocument = dict[str, Any]


@dataclass(frozen=True, slots=True)
class GatewayRoute:
    """Describe one Application Service route without carrying workload configuration."""

    id: UUID
    namespace: str


@dataclass(frozen=True, slots=True)
class GatewayTLSMaterial:
    """Carry the immutable per-compute CA certificate, server certificate, and private key."""

    ca_certificate: str
    certificate: str
    private_key: str


@dataclass(frozen=True, slots=True)
class GatewayManifests:
    """Hold gateway Pod dependencies and exact Secrets identified explicitly."""

    auth_secret: KubernetesDocument
    tls_secret: KubernetesDocument
    config_map: KubernetesDocument
    deployment: KubernetesDocument
    network_policy: KubernetesDocument


class Gateway:
    """Manage the compute gateway boundary for public TLS termination and authenticated Application routing.

    Routing inputs come from desired state rather than cluster discovery.
    """

    def __init__(self, resources: KubernetesResources) -> None:
        """Initialize gateway lifecycle access through shared cluster resources."""

        self._resources = resources

    def system_namespace(self) -> KubernetesDocument:
        """Render the LongLink system Namespace."""

        # Render the dedicated Namespace for LongLink Platform resources.
        return templates.readyml_list(PLATFORM_TEMPLATES.joinpath("system_namespace.yml"))[0]

    def service(self) -> KubernetesDocument:
        """Render the stable public LoadBalancer Service that establishes the compute endpoint.

        Reconciliation applies it before TLS generation because the endpoint determines the certificate SAN.
        """

        # Render the stable endpoint independently from gateway Pod revisions.
        return templates.readyml_list(PLATFORM_TEMPLATES.joinpath("gateway_service.yml"))[0]

    def config(self, desired_routes: tuple[GatewayRoute, ...]) -> str:
        """Render deterministic authenticated Envoy routes from the authoritative route snapshot.

        Omitted applications receive no route even if stale Services still exist.
        """

        # Every application gets one authenticated route and one DNS-backed cluster.
        routes: list[EnvoyDocument] = []
        clusters: list[EnvoyDocument] = []
        gateway_secret_match: EnvoyDocument = {
            "name": "x-longlink-gateway-secret",
            "string_match": {"exact": "__LONG_LINK_GATEWAY_SECRET__"},
        }
        for route in sorted(desired_routes, key=lambda item: (item.namespace, str(item.id))):
            application_id = str(route.id)
            service_name = f"app-{application_id}"
            cluster_name = f"{route.namespace}-{application_id}"
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
                                                    "address": f"{service_name}.{route.namespace}.svc",
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
        rendered_routes: list[EnvoyDocument] = [
            {
                "match": {"path": "/ready"},
                "direct_response": {"status": 200},
            },
            *routes,
        ]
        config = templates.readyml_list(
            PLATFORM_TEMPLATES.joinpath("envoy.yml"),
            routes=json.dumps(rendered_routes, separators=(",", ":")),
            clusters=json.dumps(clusters, separators=(",", ":")),
        )[0]
        stream = StringIO()
        yaml.safe_dump(config, stream=stream, sort_keys=False)
        return stream.getvalue()

    def tls(self, compute_id: str, endpoint: str) -> GatewayTLSMaterial:
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
            .not_valid_after(now + timedelta(days=3650))
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

    def manifests(
        self,
        proxy_secret: str,
        tls: GatewayTLSMaterial,
        envoy_config: str,
    ) -> GatewayManifests:
        """Render exact gateway Secrets and applied resources under one revision derived from behavior and secret inputs.

        Exact Secret replacement removes omitted keys, while the content revision rolls Pods when trust, auth, or config changes.
        """

        # Hash rendered behavior and secret material so every relevant change rolls the gateway pods.
        source = PLATFORM_TEMPLATES.joinpath("gateway.yml").read_text(encoding="utf-8")
        revision_input = json.dumps(
            {
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
            f"{source}\n{revision_input}".encode(),
            hashlib.sha256,
        ).hexdigest()
        manifests = templates.readyml_list(
            PLATFORM_TEMPLATES.joinpath("gateway.yml"),
            envoy_config=json.dumps(envoy_config),
            gateway_secret=json.dumps(proxy_secret),
            runtime_revision=runtime_revision,
            tls_certificate=json.dumps(tls.certificate),
            tls_private_key=json.dumps(tls.private_key),
        )

        return GatewayManifests(
            auth_secret=manifests[0],
            tls_secret=manifests[1],
            config_map=manifests[2],
            deployment=manifests[3],
            network_policy=manifests[4],
        )

    async def endpoint(self) -> str | None:
        """Apply gateway endpoint resources and return the allocated hostname or IP when available."""

        # Establish the system Namespace before asking the provider for a public LoadBalancer endpoint.
        await self._resources.apply(self.system_namespace())
        service = await self._resources.apply(self.service())
        if not isinstance(service, Service):
            raise TypeError("Gateway Service apply returned an unexpected resource kind")

        # Parse the provider-owned Service status without blocking while allocation is pending.
        body: Any = service.to_dict()
        status = body.get("status", {}) if isinstance(body, dict) else {}
        load_balancer = status.get("loadBalancer", {}) if isinstance(status, dict) else {}
        ingress = load_balancer.get("ingress", []) if isinstance(load_balancer, dict) else []
        if isinstance(ingress, list):
            for entry in ingress:
                if not isinstance(entry, dict):
                    continue
                for field in ("hostname", "ip"):
                    value = entry.get(field)
                    if isinstance(value, str) and value.strip():
                        return value.strip().rstrip(".")
        return None

    async def apply(self, routes: tuple[GatewayRoute, ...], proxy_secret: str, tls: GatewayTLSMaterial) -> bool:
        """Apply the desired gateway runtime and return whether its Deployment rollout is ready."""

        # Render the complete runtime before changing any gateway dependency.
        manifests = self.manifests(proxy_secret, tls, self.config(routes))

        # Apply exact secrets and runtime resources before inspecting the returned Deployment generation.
        await self._resources.replace_secret(manifests.auth_secret)
        await self._resources.replace_secret(manifests.tls_secret)
        await self._resources.apply(manifests.config_map)
        deployment = await self._resources.apply(manifests.deployment)
        if not isinstance(deployment, Deployment):
            raise TypeError("Gateway Deployment apply returned an unexpected resource kind")
        await self._resources.apply(manifests.network_policy)

        # A ready old ReplicaSet is insufficient; the controller must observe this generation with every replica updated.
        generation = deployment.metadata.get("generation")
        replicas = deployment.spec.get("replicas", 1)
        status = deployment.raw.get("status")
        return (
            isinstance(generation, int)
            and isinstance(replicas, int)
            and isinstance(status, dict)
            and status.get("observedGeneration") == generation
            and status.get("updatedReplicas", 0) == replicas
            and status.get("readyReplicas", 0) == replicas
            and status.get("availableReplicas", 0) == replicas
        )

    async def delete(self) -> None:
        """Delete the gateway system Namespace and wait for its resources to terminate."""

        # A missing Namespace means gateway cleanup already completed.
        namespace = await self._resources.read(Namespace, GATEWAY_NAMESPACE)
        if namespace is None:
            return
        await self._resources.delete(Namespace, namespace.name)

        # Namespace finalizers must complete before the compute registry can be removed.
        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while await self._resources.read(Namespace, namespace.name) is not None:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Kubernetes Namespace {namespace.name!r} did not terminate before deletion")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
