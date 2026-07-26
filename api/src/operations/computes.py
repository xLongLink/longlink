from src.utils import jobs
from src.utils.jobs import operation
from src.environments import env
from packaging.version import Version
from src.database.services import compute, applications
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredCompute, ReconcileResult, DesiredGatewayRoute
from src.database.models.computes import ComputeRegistry
from src.database.models.operations import Operation


def gateway_tls(registry: ComputeRegistry) -> GatewayTLSMaterial | None:
    """Return complete persisted gateway TLS material when available."""

    # Partial material cannot identify a usable persisted gateway certificate.
    if registry.gateway_ca_certificate is None or registry.gateway_tls_certificate is None or registry.gateway_tls_private_key is None:
        return None
    return GatewayTLSMaterial(
        ca_certificate=registry.gateway_ca_certificate,
        certificate=registry.gateway_tls_certificate,
        private_key=registry.gateway_tls_private_key,
    )


async def reconcile_gateway(registry: ComputeRegistry, cluster: Kubernetes) -> ReconcileResult:
    """Apply only compute bootstrap and gateway state from the current routable Application inventory."""

    async def stage_tls(material: GatewayTLSMaterial) -> None:
        """Stage gateway trust before Kubernetes can begin serving a rotated certificate."""

        staged = await compute.stage_gateway_tls(
            registry.id,
            material.ca_certificate,
            material.certificate,
            material.private_key,
        )
        if not staged:
            raise RuntimeError("Compute registry disappeared while staging gateway TLS")

    # Routes contain only running Applications and stable Organization Namespace identities.
    route_rows = [] if registry.deleted_at is not None else await applications.gateway_routes(registry.id)
    desired = DesiredCompute(
        id=registry.id,
        routes=() if registry.deleted_at is not None else tuple(DesiredGatewayRoute(id=item[0], namespace=item[1]) for item in route_rows),
        deleting=registry.deleted_at is not None,
    )
    return await cluster.reconcile(desired, registry.proxy_secret, gateway_tls(registry), stage_tls)


async def record_gateway(claimed: Operation, registry: ComputeRegistry, result: ReconcileResult) -> bool:
    """Persist gateway state without regressing the observed Platform release."""

    return await compute.record_success(
        registry.id,
        claimed.platform_version,
        result.gateway_url,
        result.gateway_ca_certificate,
        result.gateway_tls_certificate,
        result.gateway_tls_private_key,
    )


@operation("compute")
async def reconcile(claimed: Operation) -> jobs.OperationOutcome:
    """Reconcile one compute's gateway and cluster-bootstrap resources."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    registry = await compute.get(claimed.compute_id, include_deleted=True)
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
        if not await record_gateway(claimed, registry, result):
            return jobs.retry("Compute gateway state was not recorded")
        return jobs.complete()
    except Exception:
        # Record failed compute state while the worker logs detailed diagnostics.
        await compute.record_failure(registry.id)
        raise
