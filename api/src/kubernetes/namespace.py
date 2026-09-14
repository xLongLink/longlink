from uuid import UUID


def compute(organization_id: UUID) -> str:
    """Return the Kubernetes namespace for one Organization's Solution workloads."""

    return f"longlink-compute-{organization_id.hex}"


def database(organization_id: UUID) -> str:
    """Return the Kubernetes namespace for one Organization's database cluster."""

    return f"longlink-database-{organization_id.hex}"


def database_hostname(organization_id: UUID) -> str:
    """Return the private DNS hostname for one Organization's writable database Service."""

    return f"database-rw.{database(organization_id)}.svc.cluster.local"


def solution_hostname(organization_id: UUID, solution_id: UUID) -> str:
    """Return the private DNS hostname for one Solution Knative Service."""

    return f"solution-{solution_id}.{compute(organization_id)}.svc.cluster.local"
