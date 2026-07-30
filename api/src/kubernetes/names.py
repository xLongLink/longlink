from uuid import UUID

APPLICATION_ID_LABEL = "longlink.io/application-id"

def application_service_name(application_id: UUID) -> str:
    """Return the stable Service name for one Application."""

    return f"app-{application_id}"


def application_environment_secret_name(application_id: UUID) -> str:
    """Return the user-managed environment Secret name for one Application."""

    return f"{application_id}-environment"


def application_runtime_secret_name(application_id: UUID) -> str:
    """Return the Platform-managed runtime Secret name for one Application."""

    return f"{application_id}-runtime"
