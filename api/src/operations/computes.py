import secrets
import ipaddress
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import generate_gateway_tls
from src.database.models.operations import Operation


async def create(claimed: Operation) -> str | None:
    """Reconcile one Compute's shared authenticated Envoy Gateway."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    async with session_scope() as session:
        registry = await compute.get(session, claimed.target_id)
    if registry is None:
        return None
    cluster = Kubernetes(registry.kubeconfig)

    # Reapply static Gateway resources without rotating published client credentials.
    if (
        registry.status == Status.running
        and registry.gateway_url is not None
        and registry.gateway_api_key is not None
        and registry.gateway_certificate is not None
    ):
        gateway_address = await cluster.gateway.apply()
        try:
            address = ipaddress.ip_address(gateway_address)
        except ValueError:
            gateway_host = gateway_address
        else:
            gateway_host = f"[{address}]" if address.version == 6 else str(address)
        if registry.gateway_url != f"https://{gateway_host}":
            return "Gateway endpoint changed and requires explicit credential rotation"
        return None

    # Generate Gateway credentials only while bootstrapping an unpublished Compute.
    api_key = secrets.token_urlsafe(32)
    _, server_certificate, server_private_key = generate_gateway_tls(registry.id, None)

    # Envoy Gateway allocates and publishes the shared production data-plane endpoint.
    gateway_address = await cluster.gateway.apply(server_certificate, server_private_key, api_key)

    # Replace the bootstrap identity with a certificate bound to the published endpoint.
    gateway_certificate, server_certificate, server_private_key = generate_gateway_tls(registry.id, gateway_address)
    await cluster.gateway.replace_tls(server_certificate, server_private_key, gateway_certificate, gateway_address)

    # Format IP addresses and controller-published hostnames for URL authority syntax.
    try:
        address = ipaddress.ip_address(gateway_address)
    except ValueError:
        gateway_host = gateway_address
    else:
        gateway_host = f"[{address}]" if address.version == 6 else str(address)

    # Publish connection material only after the desired gateway Deployment is serving.
    async with session_scope() as session:
        recorded = await compute.record_success(
            session,
            registry.id,
            f"https://{gateway_host}",
            api_key,
            gateway_certificate,
            registry.status,
        )
        await session.commit()
    if not recorded:
        return "Compute gateway state was not recorded"
