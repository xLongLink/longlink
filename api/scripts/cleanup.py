import asyncio
from kr8s import NotFoundError
from uuid import UUID
from pathlib import Path
from sqlmodel import col
from contextlib import aclosing
from sqlalchemy import text, select
from pydantic_settings import BaseSettings, SettingsConfigDict
from src.models.computes import kubeconfig_mapping
from kr8s.asyncio.objects import Namespace
from src.database.session import session_scope
from src.kubernetes.client import Kubernetes
from src.database.models.storages import StorageRegistry
from src.adapters.storage.exoscale import Exoscale
from src.database.models.solutions import Solution
from src.database.models.organizations import Organization


class CleanupSettings(BaseSettings):
    """Define the Kubernetes connection used for development resource cleanup."""

    # Compute registry
    KUBECONFIG: Path = Path(__file__).resolve().parents[1] / "kubeconfig.yaml"

    model_config = SettingsConfigDict(
        env_file=".env.seed",
        env_file_encoding="utf-8",
        extra="ignore",
    )


async def cleanup() -> None:
    """Delete and verify all resources owned by the configured seed environment."""

    # Validate cleanup configuration before inventorying or mutating external resources.
    settings = CleanupSettings()
    kubeconfig = settings.KUBECONFIG.resolve()
    if not kubeconfig.is_file():
        raise ValueError(f"Kubeconfig not found: {kubeconfig}")
    cluster = Kubernetes(kubeconfig_mapping(kubeconfig.read_text(encoding="utf-8")))

    # Collect provider resources from current Platform state.
    organization_ids: set[UUID] = set()
    storage_resources: dict[tuple[str, str, str, UUID], set[UUID]] = {}
    async with session_scope() as session:
        result = await session.execute(
            select(
                col(Organization.id),
                col(Solution.id),
                col(StorageRegistry.endpoint_url),
                col(StorageRegistry.access_key_id),
                col(StorageRegistry.secret_access_key),
            )
            .select_from(Organization)
            .join(StorageRegistry, col(StorageRegistry.id) == col(Organization.storage_id))
            .outerjoin(Solution, col(Solution.organization_id) == col(Organization.id))
        )
        for (
            organization,
            solution,
            endpoint_url,
            access_key_id,
            secret_access_key,
        ) in result:
            organization_ids.add(organization)

            # Group Solution credentials and the Organization bucket by storage registry.
            storage_key = (endpoint_url, access_key_id, secret_access_key, organization)
            storage_solutions = storage_resources.setdefault(storage_key, set())
            if solution is not None:
                storage_solutions.add(solution)

    # Verify all compute Pods have terminated before destroying any Organization database.
    removed_namespaces = 0
    async with aclosing(cluster):
        api = await cluster.api()
        for prefix in ("longlink-compute", "longlink-database"):
            deleting_namespaces: dict[str, Namespace] = {}
            for organization_id in sorted(organization_ids):
                namespace = f"{prefix}-{organization_id.hex}"
                namespace_resource = Namespace(namespace, api=api)
                try:
                    await namespace_resource.delete()
                except NotFoundError:
                    continue
                deleting_namespaces[namespace] = namespace_resource

            # Complete each deletion pass before the next boundary or Platform state is removed.
            removed_namespaces += len(deleting_namespaces)
            try:
                async with asyncio.timeout(10 * 60):
                    while deleting_namespaces:
                        remaining: dict[str, Namespace] = {}
                        for namespace, resource in deleting_namespaces.items():
                            if await resource.exists():
                                remaining[namespace] = resource
                        deleting_namespaces = remaining
                        if deleting_namespaces:
                            await asyncio.sleep(5)
            except TimeoutError:
                names = ", ".join(sorted(deleting_namespaces))
                raise RuntimeError(f"Kubernetes namespaces did not terminate: {names}") from None

    # Revoke Solution credentials before emptying and deleting each Organization bucket.
    for (endpoint_url, access_key_id, secret_access_key, organization), solution_ids in storage_resources.items():
        storage = Exoscale(endpoint_url, access_key_id, secret_access_key)
        for solution in solution_ids:
            await storage.revoke_solution(solution.hex)
        await storage.delete(organization.hex)

        # Verify both IAM and object-storage resources are absent before clearing Platform state.
        remaining_credentials = [solution for solution in solution_ids if await storage.solution_credentials_exist(solution.hex)]
        if remaining_credentials:
            names = ", ".join(str(solution) for solution in sorted(remaining_credentials))
            raise RuntimeError(f"Exoscale Solution credentials remain: {names}")
        if await storage.usage(organization.hex) is not None:
            raise RuntimeError(f"Exoscale Organization bucket remains: {organization}")

    # Remove Platform lifecycle and registry state only after external cleanup is verified.
    cleanup_order = (
        "operations",
        "organization_invitations",
        "organization_activities",
        "user_organizations",
        "solutions",
        "organizations",
        "compute_registries",
        "storage_registries",
    )
    async with session_scope() as session:
        for table in cleanup_order:
            await session.execute(text(f"DELETE FROM {table}"))
        await session.commit()

    print(
        f"Removed and verified {removed_namespaces} Kubernetes namespaces "
        f"and {len(storage_resources)} storage resources. Shared cluster controllers were retained."
    )


def main() -> None:
    """Clean the configured seed resources from a synchronous entrypoint."""

    # Keep the command-line boundary separate from asynchronous provider cleanup.
    asyncio.run(cleanup())


if __name__ == "__main__":
    main()
