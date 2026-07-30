from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .gateway import GatewayClient, GatewayRequestError
    from .storage import Exoscale
    from .postgres import Postgres


def __getattr__(name: str) -> object:
    """Load one infrastructure adapter without importing unrelated boundaries."""

    # Load the gateway transport only for API proxy traffic.
    if name in {"GatewayClient", "GatewayRequestError"}:
        from .gateway import GatewayClient, GatewayRequestError

        return {"GatewayClient": GatewayClient, "GatewayRequestError": GatewayRequestError}[name]

    # Load PostgreSQL provisioning without importing the gateway transport.
    if name == "Postgres":
        from .postgres import Postgres

        return Postgres

    # Load object-storage provisioning without importing the gateway transport.
    if name == "Exoscale":
        from .storage import Exoscale

        return Exoscale

    # Preserve normal module attribute errors for unsupported adapter names.
    raise AttributeError(name)
