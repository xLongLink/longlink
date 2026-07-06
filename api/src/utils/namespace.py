from src.utils.names import knames

POSTGRES_IDENTIFIER_MAX_LENGTH = 63


def dbname(value: str) -> str:
    """Return the managed PostgreSQL database name for one value."""

    knames(value, "Database source name")
    database_name = f"longlink_{value}"
    if len(database_name) > POSTGRES_IDENTIFIER_MAX_LENGTH:
        raise ValueError(f"Database name must be at most {POSTGRES_IDENTIFIER_MAX_LENGTH} characters")

    return database_name


def k8name(value: str) -> str:
    """Return the managed Kubernetes name for one value."""

    knames(value, "Kubernetes source name")
    name = f"longlink-{value}"
    return knames(name, "Kubernetes name")
