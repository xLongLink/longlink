import asyncio
from uuid import UUID
from sqlalchemy import text
from scripts.seed import SeedSettings
from src.models.types import DatabaseSSLMode
from src.models.computes import kubeconfig_mapping
from kr8s.asyncio.objects import Namespace
from src.database.session import session_scope
from src.adapters.postgres import Postgres
from src.kubernetes.client import Kubernetes
from src.adapters.storage.exoscale import Exoscale


async def cleanup() -> None:
    """Delete and verify all resources owned by the configured seed environment."""

    # Validate cleanup configuration before inventorying or mutating external resources.
    settings = SeedSettings()
    kubeconfig = settings.KUBECONFIG.resolve()
    if not kubeconfig.is_file():
        raise ValueError(f"Kubeconfig not found: {kubeconfig}")
    cluster = Kubernetes(kubeconfig_mapping(kubeconfig.read_text(encoding="utf-8")))
    api = await cluster.api()

    # Collect provider resources from current Platform state.
    managed_namespaces = {"longlink-system"}
    storage_resources: dict[tuple[str, str, str, UUID], set[UUID]] = {}
    database_resources: dict[tuple[str, int, str, str, DatabaseSSLMode, UUID], set[UUID]] = {}
    async with session_scope() as session:
        result = await session.execute(
            text(
                """
                SELECT organizations.id,
                       applications.id,
                       database_registries.host,
                       database_registries.port,
                       database_registries.username,
                       database_registries.password,
                       database_registries.sslmode,
                       storage_registries.endpoint_url,
                       storage_registries.access_key_id,
                       storage_registries.secret_access_key
                FROM organizations
                JOIN database_registries ON database_registries.id = organizations.database_id
                JOIN storage_registries ON storage_registries.id = organizations.storage_id
                LEFT JOIN applications ON applications.organization_id = organizations.id
                """
            )
        )
        for (
            organization_id,
            application_id,
            database_host,
            database_port,
            database_username,
            database_password,
            database_sslmode,
            endpoint_url,
            access_key_id,
            secret_access_key,
        ) in result:
            organization = UUID(str(organization_id))
            managed_namespaces.add(organization.hex)

            # Group Application credentials and the Organization bucket by storage registry.
            storage_key = (str(endpoint_url), str(access_key_id), str(secret_access_key), organization)
            storage_applications = storage_resources.setdefault(storage_key, set())
            if application_id is not None:
                storage_applications.add(UUID(str(application_id)))

            # Group Application runtime identities and the Organization database by database registry.
            sslmode = database_sslmode if isinstance(database_sslmode, DatabaseSSLMode) else DatabaseSSLMode(str(database_sslmode))
            database_key = (
                str(database_host),
                int(database_port),
                str(database_username),
                str(database_password),
                sslmode,
                organization,
            )
            database_applications = database_resources.setdefault(database_key, set())
            if application_id is not None:
                database_applications.add(UUID(str(application_id)))

    # Delete only namespaces selected by local seed configuration and tracked Platform state.
    existing_namespaces: dict[str, Namespace] = {}
    for namespace in sorted(managed_namespaces):
        namespace_resource = Namespace(namespace, api=api)
        if not await namespace_resource.exists():
            continue
        existing_namespaces[namespace] = namespace_resource

    # Stop all managed workloads before revoking the credentials they can consume.
    removed_namespaces = len(existing_namespaces)
    for namespace in sorted(existing_namespaces):
        await existing_namespaces[namespace].delete()
    try:
        async with asyncio.timeout(10 * 60):
            while existing_namespaces:
                remaining: dict[str, Namespace] = {}
                for namespace, resource in existing_namespaces.items():
                    if await resource.exists():
                        remaining[namespace] = resource
                if not remaining:
                    break
                existing_namespaces = remaining
                await asyncio.sleep(5)
    except TimeoutError:
        names = ", ".join(sorted(existing_namespaces))
        raise RuntimeError(f"Kubernetes namespaces did not terminate: {names}") from None

    # Remove the cluster-scoped class after its LongLink Gateway and data plane are gone.
    await cluster.gateway.delete()

    # Revoke Application credentials before emptying and deleting each Organization bucket.
    for (endpoint_url, access_key_id, secret_access_key, organization), application_ids in storage_resources.items():
        storage = Exoscale(endpoint_url, access_key_id, secret_access_key)
        for application in application_ids:
            await storage.revoke(application.hex)
        await storage.delete(organization.hex)

        # Verify both IAM and object-storage resources are absent before clearing Platform state.
        remaining_credentials = [application for application in application_ids if await storage.credentials_exist(application.hex)]
        if remaining_credentials:
            names = ", ".join(str(application) for application in sorted(remaining_credentials))
            raise RuntimeError(f"Exoscale Application credentials remain: {names}")
        if await storage.usage(organization.hex) is not None:
            raise RuntimeError(f"Exoscale Organization bucket remains: {organization}")

    # Remove Application schemas and runtime identities before deleting each Organization database.
    for (host, port, username, password, sslmode, organization), application_ids in database_resources.items():
        database = Postgres(host, port, username, password, sslmode)
        for application in application_ids:
            await database.delete_schema(organization, application)
        await database.delete_database(organization)

        # Verify the database and every cluster-global runtime identity are absent.
        remaining_identities = [
            application for application in application_ids if await database.application_runtime_identity_exists(organization, application)
        ]
        if remaining_identities:
            names = ", ".join(str(application) for application in sorted(remaining_identities))
            raise RuntimeError(f"PostgreSQL Application runtime identities remain: {names}")
        if await database.database_usage(organization.hex) is not None:
            raise RuntimeError(f"PostgreSQL Organization database remains: {organization}")

    # Remove Platform lifecycle and registry state only after external cleanup is verified.
    cleanup_order = (
        "operations",
        "organization_invitations",
        "user_organizations",
        "applications",
        "organizations",
        "compute_registries",
        "database_registries",
        "storage_registries",
    )
    async with session_scope() as session:
        for table in cleanup_order:
            await session.execute(text(f"DELETE FROM {table}"))
        await session.commit()

    print(
        f"Removed and verified {removed_namespaces} Kubernetes namespaces, "
        f"{len(database_resources)} database resources, and {len(storage_resources)} storage resources."
    )


def main() -> None:
    """Clean the configured seed resources from a synchronous entrypoint."""

    # Keep the command-line boundary separate from asynchronous provider cleanup.
    asyncio.run(cleanup())


if __name__ == "__main__":
    main()
