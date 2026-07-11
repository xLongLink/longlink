from uuid import UUID
from src.utils import urls


def upstream_application_url(application_id: UUID, ingress_host: str) -> str:
    """Return the cluster gateway URL for one deployed application."""

    return f"{urls.origin(ingress_host)}/api/applications/{application_id}/proxy/"
