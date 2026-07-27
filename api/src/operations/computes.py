import ipaddress
from src.utils import jobs
from dataclasses import dataclass
from src.utils.jobs import operation
from src.environments import env
from packaging.version import Version
from src.models.statuses import ComputeStatus
from src.database.services import compute, applications
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayRoute, GatewayTLSMaterial
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation


@dataclass(frozen=True, slots=True)
class ReconcileResult:
    """Carry gateway convergence and connection state across operation handlers."""

    ready: bool
    gateway_url: str | None


async def reconcile_gateway(registry: ComputeRegistry, cluster: Kubernetes) -> ReconcileResult:
    """Apply only compute bootstrap and gateway state from the current routable Application inventory."""

    # Compute deletion owns the complete gateway Namespace after every Organization has been removed.
    if registry.status == ComputeStatus.deleting:
        await cluster.gateway.delete()
        return ReconcileResult(True, None)

    # Public endpoint allocation precedes endpoint-bound TLS generation and runtime deployment.
    endpoint = await cluster.gateway.endpoint()
    if endpoint is None:
        return ReconcileResult(False, None)

    # Persisted gateway TLS must be either complete or absent for initial provisioning.
    if registry.gateway_ca_certificate is None and registry.gateway_tls_certificate is None and registry.gateway_tls_private_key is None:
        tls = cluster.gateway.tls(str(registry.id), endpoint)
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
    ready = await cluster.gateway.apply(routes, registry.proxy_secret, tls)

    # Format an IPv6 endpoint for URL authority syntax while leaving hostnames and IPv4 unchanged.
    try:
        parsed_endpoint = ipaddress.ip_address(endpoint)
    except ValueError:
        parsed_endpoint = None
    gateway_host = f"[{endpoint}]" if parsed_endpoint is not None and parsed_endpoint.version == 6 else endpoint
    return ReconcileResult(ready, f"https://{gateway_host}")


@operation("compute.reconcile")
async def reconcile(claimed: Operation) -> jobs.OperationOutcome:
    """Reconcile one compute's gateway and cluster-bootstrap resources."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    registry = await compute.get(claimed.target_id, include_deleting=True)
    if registry is None:
        return jobs.fail("Compute registry not found")
    if claimed.platform_version != env.VERSION:
        return jobs.retry("Operation targets a different Platform release")
    if registry.version is not None and Version(registry.version) > Version(claimed.platform_version):
        return jobs.retry("Compute target was already reconciled by a newer Platform release")
    cluster = Kubernetes(registry.kubeconfig)

    try:
        # Compute reconciliation is structurally unable to deploy or delete tenant resources.
        result = await reconcile_gateway(registry, cluster)
        if not result.ready:
            return jobs.retry("Gateway is still converging")

        # Publish connection material only after the desired gateway Deployment is serving.
        if not await compute.record_success(
            registry.id,
            claimed.platform_version,
            result.gateway_url,
        ):
            return jobs.retry("Compute gateway state was not recorded")
        return jobs.complete()
    except Exception:
        # Record failed compute state while the worker logs detailed diagnostics.
        await compute.record_failure(registry.id)
        raise
