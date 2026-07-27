from src.utils import jobs
from dataclasses import dataclass
from src.utils.jobs import operation
from src.environments import env
from packaging.version import Version
from src.models.statuses import Status
from src.database.services import compute, applications
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute, GatewayTLSMaterial, generate_gateway_tls
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation


@dataclass(frozen=True, slots=True)
class ReconcileResult:
    """Carry gateway convergence and connection state across operation handlers."""

    ready: bool
    gateway_url: str | None


async def reconcile_gateway(registry: ComputeRegistry, cluster: Kubernetes, pending_route: GatewayRoute | None = None) -> ReconcileResult:
    """Apply only compute bootstrap and gateway state from the current routable Application inventory."""

    # Public IP allocation precedes IP-bound TLS generation and runtime deployment.
    gateway_ip = await cluster.gateway.ip()
    if gateway_ip is None:
        return ReconcileResult(False, None)

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

    # Routes contain only running Applications and stable Organization Namespace identities.
    route_rows = await applications.gateway_routes(registry.id)
    routes = tuple(GatewayRoute(id=item[0], namespace=item[1]) for item in route_rows)
    if pending_route is not None and all(route.id != pending_route.id for route in routes):
        routes = (*routes, pending_route)
    ready = await cluster.gateway.apply(routes, registry.proxy_secret, tls)

    # Format the typed gateway IP for URL authority syntax.
    gateway_host = f"[{gateway_ip}]" if gateway_ip.version == 6 else str(gateway_ip)
    return ReconcileResult(ready, f"https://{gateway_host}")


@operation("compute.reconcile")
async def reconcile(claimed: Operation) -> jobs.OperationOutcome:
    """Reconcile one compute's gateway and cluster-bootstrap resources."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    registry = await compute.get(claimed.target_id)
    if registry is None:
        return jobs.complete()
    if claimed.platform_version != env.VERSION:
        return jobs.fail("Operation targets a different Platform release")
    if registry.version is not None and Version(registry.version) > Version(claimed.platform_version):
        return jobs.complete()

    # A fresh reconciliation execution makes a previously failed target visibly active again.
    if registry.status == Status.failed:
        if not await compute.set_status(registry.id, Status.failed, Status.creating):
            return jobs.wait("Compute lifecycle state changed before reconciliation")
        registry.status = Status.creating
    cluster = Kubernetes(registry.kubeconfig)

    try:
        # Compute reconciliation is structurally unable to deploy or delete tenant resources.
        result = await reconcile_gateway(registry, cluster)
        if not result.ready:
            return jobs.wait("Gateway is still converging")

        # Publish connection material only after the desired gateway Deployment is serving.
        if not await compute.record_success(
            registry.id,
            claimed.platform_version,
            result.gateway_url,
            registry.status,
        ):
            return jobs.wait("Compute gateway state was not recorded")
        return jobs.complete()
    except Exception:
        # Unexpected reconciliation errors make both the compute and its one Operation terminal.
        await compute.set_status(registry.id, registry.status, Status.failed)
        raise
