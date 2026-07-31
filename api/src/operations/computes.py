from src.environments import env
from packaging.version import Version
from src.models.statuses import Status
from src.database.services import compute, applications
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute, GatewayTLSMaterial, generate_gateway_tls
from src.database.models.operations import Operation


async def reconcile(claimed: Operation) -> str | None:
    """Reconcile one compute's gateway and cluster-bootstrap resources."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    registry = await compute.get(claimed.target_id)
    if registry is None:
        return None
    platform_version = Version(env.VERSION)
    if registry.version is not None and Version(registry.version) > platform_version:
        return None

    cluster = Kubernetes(registry.kubeconfig)

    # Public IP allocation precedes IP-bound TLS generation and runtime deployment.
    gateway_ip = await cluster.gateway.ip()

    # Persisted gateway TLS must be either complete or absent for initial provisioning.
    current_tls = registry.gateway_tls
    if current_tls is None:
        if any(
            value is not None
            for value in (
                registry.gateway_ca_certificate,
                registry.gateway_identity_certificate,
                registry.gateway_identity_private_key,
            )
        ):
            raise RuntimeError("Compute registry has incomplete gateway TLS material")
        tls = generate_gateway_tls(registry.id, gateway_ip)
        initialized = await compute.initialize_gateway_tls(
            registry.id,
            tls.ca_certificate,
            tls.identity_certificate,
            tls.identity_private_key,
        )
        if not initialized:
            raise RuntimeError("Compute registry disappeared while initializing gateway TLS")
    else:
        tls = GatewayTLSMaterial(*current_tls)

    # Apply one authoritative running-Application route snapshot per compute Operation.
    route_rows = await applications.gateway_routes(registry.id)
    routes = tuple(GatewayRoute(id=item[0], namespace=item[1]) for item in route_rows)
    await cluster.gateway.apply(routes, tls)

    # Format the typed gateway IP for URL authority syntax.
    gateway_host = f"[{gateway_ip}]" if gateway_ip.version == 6 else str(gateway_ip)
    gateway_url = f"https://{gateway_host}"

    # Publish connection material only after the desired gateway Deployment is serving.
    if not await compute.record_success(
        registry.id,
        env.VERSION,
        gateway_url,
        registry.status,
    ):
        current = await compute.get(registry.id)
        if current is None or (current.version is not None and Version(current.version) > platform_version):
            return None
        if current.status == Status.running and current.version == env.VERSION and current.gateway_url == gateway_url:
            return None
        return "Compute gateway state was not recorded"
    return None
