import asyncio
from src import adapters
from seed import SeedSettings
from uuid import UUID
from pathlib import Path
from sqlalchemy import text, inspect
from src.environments import env
from src.models.types import DatabaseSSLMode
from sqlalchemy.engine import make_url
from src.models.computes import kubeconfig_mapping
from kr8s.asyncio.objects import Namespace, Deployment, NetworkPolicy
from src.database.session import session_scope
from src.kubernetes.names import APPLICATION_ID_LABEL
from src.kubernetes.resources import KubernetesResources


async def cleanup() -> None:
    """Delete development compute, database, and storage resources from seed configuration."""

    # Load the same kubeconfig and provider settings used to seed the development resources.
    settings = SeedSettings()
    kubeconfig = settings.KUBECONFIG.resolve()
    if not kubeconfig.is_file():
        raise ValueError(f"Kubeconfig not found: {kubeconfig}")
    resources = KubernetesResources(kubeconfig_mapping(kubeconfig.read_text(encoding="utf-8")))
    policies, deployments = await asyncio.gather(
        resources.list(NetworkPolicy),
        resources.list(Deployment),
    )
    namespaces = {"longlink-system"}
    for policy in policies:
        namespace = policy.metadata.get("namespace")
        if policy.name == "longlink-gateway-ingress" and isinstance(namespace, str):
            namespaces.add(namespace)
    for deployment in deployments:
        namespace = deployment.metadata.get("namespace")
        selector = deployment.spec.get("selector")
        labels = selector.get("matchLabels") if isinstance(selector, dict) else None
        if isinstance(namespace, str) and isinstance(labels, dict) and APPLICATION_ID_LABEL in labels:
            namespaces.add(namespace)

    # Delete only namespaces identified by LongLink-owned resources and wait for their cascading cleanup.
    managed: list[str] = []
    for namespace in sorted(namespaces):
        if await resources.read(Namespace, namespace) is not None:
            managed.append(namespace)
    removed_compute = len(managed)
    for namespace in managed:
        await resources.delete(Namespace, namespace)
    while managed:
        remaining: list[str] = []
        for namespace in managed:
            if await resources.read(Namespace, namespace) is not None:
                remaining.append(namespace)
        if not remaining:
            break
        managed = remaining
        await asyncio.sleep(5)

    # Avoid creating a new SQLite database when local development has no persisted state.
    database_url = make_url(env.DATABASE_URL)
    database_name = database_url.database
    if database_url.get_backend_name() == "sqlite" and database_name is not None and database_name not in {"", ":memory:"}:
        database_path = Path(database_name).resolve()
        if not database_path.is_file():
            print(f"Removed {removed_compute} compute namespaces; no Platform state requires cleanup.")
            return

    # Inventory seeded database and storage resources before Make removes local Platform state.
    async with session_scope() as session:
        connection = await session.connection()
        tables = await connection.run_sync(lambda sync_connection: inspect(sync_connection).get_table_names())
        if not {"applications", "database_registries", "organizations", "storage_registries"}.issubset(tables):
            print(f"Removed {removed_compute} compute namespaces; no Platform state requires cleanup.")
            return
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
                LEFT JOIN database_registries ON database_registries.id = organizations.database_id
                LEFT JOIN storage_registries ON storage_registries.id = organizations.storage_id
                LEFT JOIN applications ON applications.organization_id = organizations.id
                """
            )
        )
        storage_resources: dict[tuple[str, str, str, UUID], set[UUID]] = {}
        database_resources: dict[tuple[str, int, str, str, str, UUID], set[UUID]] = {}
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

            # Group Application credentials and Organization buckets by their storage registry.
            if endpoint_url is not None and access_key_id is not None and secret_access_key is not None:
                storage_key = (str(endpoint_url), str(access_key_id), str(secret_access_key), organization)
                storage_applications = storage_resources.setdefault(storage_key, set())
                if application_id is not None:
                    storage_applications.add(UUID(str(application_id)))

            # Group Application schemas and Organization databases by their database registry.
            if (
                database_host is not None
                and database_port is not None
                and database_username is not None
                and database_password is not None
                and database_sslmode is not None
            ):
                database_key = (
                    str(database_host),
                    int(database_port),
                    str(database_username),
                    str(database_password),
                    str(database_sslmode),
                    organization,
                )
                database_applications = database_resources.setdefault(database_key, set())
                if application_id is not None:
                    database_applications.add(UUID(str(application_id)))

    # Remove scoped credentials before emptying and deleting each Organization bucket.
    for (
        endpoint_url,
        access_key_id,
        secret_access_key,
        organization_id,
    ), application_ids in storage_resources.items():
        storage = adapters.Exoscale(endpoint_url, access_key_id, secret_access_key)
        for application_id in application_ids:
            await storage.revoke(application_id.hex)
        await storage.delete(organization_id.hex)

    # Remove Application roles before deleting each Organization database.
    for (
        host,
        port,
        username,
        password,
        sslmode,
        organization_id,
    ), application_ids in database_resources.items():
        database = adapters.Postgres(host, port, username, password, DatabaseSSLMode(sslmode))
        for application_id in application_ids:
            await database.delete_schema(organization_id, application_id)
        await database.delete_database(organization_id)

    print(
        f"Removed {removed_compute} compute namespaces, "
        f"{len(database_resources)} database resources, and {len(storage_resources)} storage resources."
    )


def main() -> None:
    """Clean the configured development resources from a synchronous entrypoint."""

    # Keep the command-line boundary separate from asynchronous provider cleanup.
    asyncio.run(cleanup())


if __name__ == "__main__":
    main()
