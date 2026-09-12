import asyncio
from sqlmodel import col
from contextlib import aclosing
from sqlalchemy import delete, select, update
from src.database.session import session_scope
from src.kubernetes.client import Kubernetes
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def cleanup() -> None:
    """Remove registered organization resources before purging Platform metadata."""

    # Use each organization's actual compute, rather than a single workstation kubeconfig.
    async with session_scope() as session:
        result = await session.execute(
            select(Organization, ComputeRegistry).join(ComputeRegistry, col(ComputeRegistry.id) == col(Organization.compute_id))
        )
        targets = result.all()
    for organization, compute in targets:
        cluster = Kubernetes(compute.kubeconfig)
        async with aclosing(cluster):
            await cluster.organizations.delete(f"longlink-compute-{organization.id.hex}")
            await cluster.databases.delete(organization.id)
            await cluster.storage.delete(organization.id, compute)

    # External cleanup must succeed before losing its authoritative identities.
    async with session_scope() as session:
        await session.execute(delete(Operation))
        await session.execute(update(Solution).values(desired_revision_id=None, deployed_revision_id=None))
        await session.execute(delete(Organization))
        await session.execute(delete(ComputeRegistry))
        await session.commit()


def main() -> None:
    """Run explicit development cleanup with API workers stopped."""

    asyncio.run(cleanup())


if __name__ == "__main__":
    main()
