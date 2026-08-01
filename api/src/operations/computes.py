from src.environments import env
from packaging.version import Version
from src.models.statuses import Status
from src.database.services import compute, applications
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute, GatewayTLSMaterial, generate_gateway_tls
from src.database.models.operations import Operation


async def create(claimed: Operation) -> str | None:
    """Create or recreate one compute's gateway and cluster-bootstrap resources."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    registry = await compute.get(claimed.target_id)
    if registry is None:
        return None
    platform_version = Version(claimed.platform_version)
    if Version(registry.version) > platform_version:
        return None

    cluster = Kubernetes(registry.kubeconfig)

    # Public IP allocation precedes IP-bound TLS generation and runtime deployment.
    gateway_ip = await cluster.gateway.ip()

    # Persisted gateway TLS must be either complete or absent.
    ca_certificate = registry.gateway_ca_certificate
    identity_certificate = registry.gateway_identity_certificate
    identity_private_key = registry.gateway_identity_private_key
    missing_tls = ca_certificate is None or identity_certificate is None or identity_private_key is None
    if missing_tls:
        if any(value is not None for value in (ca_certificate, identity_certificate, identity_private_key)):
            raise RuntimeError("Compute registry has incomplete gateway TLS material")

    # Generate a fresh identity for the initial creation and every Platform release.
    if missing_tls or Version(registry.version) < platform_version:
        tls = generate_gateway_tls(registry.id, gateway_ip)
        replaced = await compute.replace_gateway_tls(
            registry.id,
            tls.ca_certificate,
            tls.identity_certificate,
            tls.identity_private_key,
        )
        if not replaced:
            raise RuntimeError("Compute registry disappeared while updating gateway TLS")
    else:
        assert ca_certificate is not None
        assert identity_certificate is not None
        assert identity_private_key is not None
        tls = GatewayTLSMaterial(ca_certificate, identity_certificate, identity_private_key)

    # Apply one authoritative running-Application route snapshot per compute Operation.
    route_rows = await applications.gateway_routes(registry.id)
    routes = tuple(GatewayRoute(id=item[0], namespace=item[1].hex) for item in route_rows)
    await cluster.gateway.apply(routes, tls)

    # Format the typed gateway IP for URL authority syntax.
    gateway_host = f"[{gateway_ip}]" if gateway_ip.version == 6 else str(gateway_ip)
    gateway_url = f"https://{gateway_host}"

    # Publish connection material only after the desired gateway Deployment is serving.
    if not await compute.record_success(
        registry.id,
        claimed.platform_version,
        gateway_url,
        registry.status,
    ):
        current = await compute.get(registry.id)
        if current is None or Version(current.version) > platform_version:
            return None
        if current.status == Status.running and current.version == claimed.platform_version and current.gateway_url == gateway_url:
            return None
        return "Compute gateway state was not recorded"
