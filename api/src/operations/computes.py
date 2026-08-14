import ipaddress
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import generate_gateway_tls
from src.database.models.operations import Operation


def gateway_url(address: str) -> str:
    """Return a URL-safe HTTPS gateway address."""

    # Bracket IPv6 literals while preserving controller-published hostnames and IPv4 addresses.
    try:
        parsed_address = ipaddress.ip_address(address)
    except ValueError:
        host = address
    else:
        host = f"[{parsed_address}]" if parsed_address.version == 6 else str(parsed_address)
    return f"https://{host}"


async def create(claimed: Operation) -> str | None:
    """Reconcile one Compute's shared authenticated Envoy Gateway."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    async with session_scope() as session:
        registry = await compute.get(session, claimed.target_id)
    if registry is None:
        return None
    cluster = Kubernetes(registry.kubeconfig)

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
    tls = generate_gateway_tls(registry.id, None)

    # Envoy Gateway allocates and publishes the shared production data-plane endpoint.
    gateway_address = await cluster.gateway.apply(tls)

    # Replace bootstrap mTLS identities with a server certificate bound to the published endpoint.
    tls = generate_gateway_tls(registry.id, gateway_address)
    await cluster.gateway.replace_tls(tls, gateway_address)

    # Publish connection material only after the desired gateway Deployment is serving.
    async with session_scope() as session:
        recorded = await compute.record_success(
            session,
            registry.id,
            gateway_url(gateway_address),
            tls.ca_certificate,
            f"{tls.client_certificate}\n{tls.client_private_key}",
            registry.status,
        )
        await session.commit()
    if not recorded:
        return "Compute gateway state was not recorded"
