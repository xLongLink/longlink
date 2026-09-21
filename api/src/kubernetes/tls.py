import ssl
import base64
from typing import TYPE_CHECKING
from kr8s.asyncio.objects import Secret

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


async def certificate(client: "Kubernetes", namespace: str, name: str) -> str:
    """Read one valid TLS certificate from a Kubernetes Secret."""

    # Decode the Kubernetes TLS Secret into the PEM trust data used by Platform clients.
    secret = Secret(name, namespace=namespace, api=await client.api())
    await secret.refresh()
    data = secret.raw.get("data", {})
    encoded_certificate = data.get("tls.crt") if isinstance(data, dict) else None
    if not isinstance(encoded_certificate, str):
        raise ValueError(f"{namespace}/{name} must contain a TLS certificate")

    try:
        value = base64.b64decode(encoded_certificate, validate=True).decode("utf-8")
        ssl.create_default_context(cadata=value)
    except (ValueError, UnicodeDecodeError, ssl.SSLError) as exc:
        raise ValueError(f"{namespace}/{name} must contain a valid TLS certificate") from exc
    return value
