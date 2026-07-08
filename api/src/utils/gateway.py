from uuid import UUID
from src.utils import urls


def origin(ingress_host: str) -> str:
    """Return the absolute origin for one compute gateway host."""

    return urls.origin(ingress_host)


def application_url(application_id: UUID, ingress_host: str) -> str:
    """Return the gateway base URL for one deployed application."""

    return f"{origin(ingress_host)}/api/applications/{application_id}/proxy/"
