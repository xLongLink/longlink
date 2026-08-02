import secrets
import ipaddress
from packaging.version import Version
from src.database.services import compute
from src.kubernetes.client import Kubernetes
from src.kubernetes.gateway import generate_gateway_tls
from src.database.models.operations import Operation


async def create(claimed: Operation) -> str | None:
    """Reconcile one Compute's shared authenticated Envoy Gateway."""

    # Load the compute root without loading provider or tenant lifecycle relationships.
    registry = await compute.get(claimed.target_id)
    if registry is None:
        return None
    platform_version = Version(claimed.platform_version)
    if Version(registry.version) > platform_version:
        return None

    cluster = Kubernetes(registry.kubeconfig)

    # Rotate authenticated Gateway access for every explicit Compute operation.
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
    if not await compute.record_success(
        registry.id,
        claimed.platform_version,
        f"https://{gateway_host}",
        api_key,
        gateway_certificate,
        registry.status,
    ):
        current = await compute.get(registry.id)
        if current is None or Version(current.version) > platform_version:
            return None
        return "Compute gateway state was not recorded"
