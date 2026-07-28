from src.utils import jobs
from src.utils.jobs import operation
from src.environments import env
from packaging.version import Version
from src.models.statuses import Status
from src.database.services import compute, applications
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute, GatewayTLSMaterial, generate_gateway_tls
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation


async def reconcile_gateway(registry: ComputeRegistry, cluster: Kubernetes, pending_route: GatewayRoute | None = None) -> str:
    """Apply only compute bootstrap and gateway state from the current routable Application inventory."""

    # Public IP allocation precedes IP-bound TLS generation and runtime deployment.
    gateway_ip = await cluster.gateway.ip()

    # Persisted gateway TLS must be either complete or absent for initial provisioning.
    if registry.gateway_ca_certificate is None and registry.gateway_tls_certificate is None and registry.gateway_tls_private_key is None:
        tls = generate_gateway_tls(registry.id, gateway_ip)
        initialized = await compute.initialize_gateway_tls(
            registry.id,
            tls.ca_certificate,
            tls.certificate,
            tls.private_key,
        )
        if not initialized:
            raise RuntimeError("Compute registry disappeared while initializing gateway TLS")
    elif (
        registry.gateway_ca_certificate is not None
        and registry.gateway_tls_certificate is not None
        and registry.gateway_tls_private_key is not None
    ):
        tls = GatewayTLSMaterial(
            ca_certificate=registry.gateway_ca_certificate,
            certificate=registry.gateway_tls_certificate,
            private_key=registry.gateway_tls_private_key,
        )
    else:
        raise RuntimeError("Compute registry has incomplete gateway TLS material")

    # Reapply only gateway state until its route snapshot matches current Platform state.
    while True:
        route_rows = await applications.gateway_routes(registry.id)
        routes = tuple(GatewayRoute(id=item[0], namespace=item[1]) for item in route_rows)
        if pending_route is not None and all(route.id != pending_route.id for route in routes):
            pending = await applications.get(pending_route.id, include_deleted=True)
            if pending is not None and pending.deleted_at is None and pending.status == Status.creating:
                routes = (*routes, pending_route)
        await cluster.gateway.apply(routes, registry.proxy_secret, tls)

        # A stable snapshot prevents a concurrent tombstone from leaving a stale published route.
        current_rows = await applications.gateway_routes(registry.id)
        current_routes = tuple(GatewayRoute(id=item[0], namespace=item[1]) for item in current_rows)
        if pending_route is not None and all(route.id != pending_route.id for route in current_routes):
            pending = await applications.get(pending_route.id, include_deleted=True)
            if pending is not None and pending.deleted_at is None and pending.status == Status.creating:
                current_routes = (*current_routes, pending_route)
        if current_routes == routes:
            break

    # Format the typed gateway IP for URL authority syntax.
    gateway_host = f"[{gateway_ip}]" if gateway_ip.version == 6 else str(gateway_ip)
    return f"https://{gateway_host}"


@operation("compute.reconcile")
async def reconcile(claimed: Operation) -> jobs.OperationOutcome:
    """Reconcile one compute's gateway and cluster-bootstrap resources."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    registry = await compute.get(claimed.target_id)
    if registry is None:
        return jobs.complete()
    platform_version = Version(env.VERSION)
    if registry.version is not None and Version(registry.version) > platform_version:
        return jobs.complete()

    # A fresh reconciliation execution makes a previously failed target visibly active again.
    if registry.status == Status.failed:
        if not await compute.set_status(registry.id, Status.failed, Status.creating):
            current = await compute.get(registry.id)
            if current is None or (current.version is not None and Version(current.version) > platform_version):
                return jobs.complete()
            return jobs.fail("Compute lifecycle state changed before reconciliation")
        registry.status = Status.creating
    cluster = Kubernetes(registry.kubeconfig)

    # Compute reconciliation is structurally unable to deploy or delete tenant resources.
    gateway_url = await reconcile_gateway(registry, cluster)

    # Publish connection material only after the desired gateway Deployment is serving.
    if not await compute.record_success(
        registry.id,
        env.VERSION,
        gateway_url,
        registry.status,
    ):
        current = await compute.get(registry.id)
        if current is None or (current.version is not None and Version(current.version) > platform_version):
            return jobs.complete()
        if current.status == Status.running and current.version == env.VERSION and current.gateway_url == gateway_url:
            return jobs.complete()
        return jobs.fail("Compute gateway state was not recorded")
    return jobs.complete()
