import ipaddress
from uuid import UUID
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import generate_gateway_tls, generate_gateway_bootstrap_tls
from src.database.models.computes import ComputeRegistry


def gateway_url(address: str) -> str:
    """Return a URL-safe HTTPS gateway address."""

    # Bracket IPv6 literals while preserving controller-published hostnames and IPv4 addresses.
    try:
        address = str(ipaddress.ip_address(address))
    except ValueError:
        return f"https://{address}"
    return f"https://[{address}]" if ":" in address else f"https://{address}"


async def create(compute_id: UUID) -> str | None:
    """Reconcile one Compute's shared authenticated Envoy Gateway."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    async with session_scope() as session:
        registry = await session.get(ComputeRegistry, compute_id)
    if registry is None:
        return None
    cluster = Kubernetes(registry.kubeconfig)

    try:
        # Reapply static Gateway resources without rotating published mTLS credentials.
        if (
            registry.status == Status.running
            and registry.gateway_url is not None
            and registry.gateway_certificate is not None
            and registry.gateway_client_identity is not None
        ):
            gateway_address = await cluster.gateway.apply()
            if registry.gateway_url != gateway_url(gateway_address):
                return "Gateway endpoint changed and requires explicit credential rotation"
            return None

        # Generate mTLS credentials only while bootstrapping an unpublished Compute.
        # Envoy Gateway allocates and publishes the shared production data-plane endpoint.
        gateway_address = await cluster.gateway.apply(generate_gateway_bootstrap_tls(registry.id))

        # Replace bootstrap mTLS identities with a server certificate bound to the published endpoint.
        tls = generate_gateway_tls(registry.id, gateway_address)
        await cluster.gateway.replace_tls(tls)

        # Publish connection material only after the desired gateway Deployment is serving.
        async with session_scope() as session:
            if not await compute.record_success(
                session,
                registry.id,
                gateway_url(gateway_address),
                tls.ca_certificate,
                f"{tls.client_certificate}\n{tls.client_private_key}",
                registry.status,
            ):
                return "Compute gateway state was not recorded"
            await session.commit()
    finally:
        closer = getattr(cluster, "aclose", None)
        if closer is not None:
            await closer()
