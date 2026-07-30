import asyncio
import argparse
from src import adapters
from seed import SeedSettings, application_database_configuration
from uuid import UUID
from pathlib import Path
from sqlalchemy import text, inspect
from src.environments import env
from src.models.types import DatabaseSSLMode
from sqlalchemy.engine import make_url
from src.models.computes import kubeconfig_mapping
from kr8s.asyncio.objects import Secret, Namespace, NetworkPolicy
from src.database.session import session_scope
from src.kubernetes.client import Kubernetes
from src.kubernetes.applications import secret_values


async def cleanup(*, reset_cluster: bool = False) -> None:
    """Delete and verify all resources owned by the configured seed environment."""

    # Validate cleanup configuration before inventorying or mutating external resources.
    settings = SeedSettings()
    kubeconfig = settings.KUBECONFIG.resolve()
    if not kubeconfig.is_file():
        raise ValueError(f"Kubeconfig not found: {kubeconfig}")
    cluster = Kubernetes(kubeconfig_mapping(kubeconfig.read_text(encoding="utf-8")))
    api = await cluster.api()
    configured_database = application_database_configuration(settings)

    # Collect provider resources from Platform state when its schema is available.
    protected_namespaces = {"cilium-secrets", "default", "kube-node-lease", "kube-public", "kube-system"}
    managed_namespaces = {"longlink-system", settings.LOCAL_ORG}
    provider_namespaces = {settings.LOCAL_ORG}
    namespace_organizations: dict[str, set[UUID]] = {}
    storage_resources: dict[tuple[str, str, str, UUID], set[UUID]] = {}
    database_resources: dict[tuple[str, int, str, str, DatabaseSSLMode, UUID], set[UUID]] = {}
    platform_tables: set[str] = set()
    platform_database_url = make_url(env.DATABASE_URL)
    platform_database_name = platform_database_url.database
    platform_database_available = True
    if (
        platform_database_url.get_backend_name() == "sqlite"
        and isinstance(platform_database_name, str)
        and platform_database_name not in {"", ":memory:"}
    ):
        platform_database_available = Path(platform_database_name).resolve().is_file()

    # Read tracked Organization assignments without creating an absent local SQLite database.
    if platform_database_available:
        async with session_scope() as session:
            connection = await session.connection()
            platform_tables = set(await connection.run_sync(lambda sync_connection: inspect(sync_connection).get_table_names()))
            required_tables = {"applications", "database_registries", "organizations", "storage_registries"}
            if required_tables.issubset(platform_tables):
                result = await session.execute(
                    text(
                        """
                        SELECT organizations.id,
                               organizations.slug,
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
                for (
                    organization_id,
                    organization_slug,
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
                    slug = str(organization_slug)
                    managed_namespaces.add(slug)
                    provider_namespaces.add(slug)
                    namespace_organizations.setdefault(slug, set()).add(organization)

                    # Group Application credentials and the Organization bucket by storage registry.
                    if endpoint_url is not None and access_key_id is not None and secret_access_key is not None:
                        storage_key = (str(endpoint_url), str(access_key_id), str(secret_access_key), organization)
                        storage_applications = storage_resources.setdefault(storage_key, set())
                        if application_id is not None:
                            storage_applications.add(UUID(str(application_id)))

                    # Group Application roles and the Organization database by database registry.
                    if (
                        database_host is not None
                        and database_port is not None
                        and database_username is not None
                        and database_password is not None
                        and database_sslmode is not None
                    ):
                        sslmode_value = (
                            database_sslmode.value if isinstance(database_sslmode, DatabaseSSLMode) else str(database_sslmode)
                        )
                        database_key = (
                            str(database_host),
                            int(database_port),
                            str(database_username),
                            str(database_password),
                            DatabaseSSLMode(sslmode_value),
                            organization,
                        )
                        database_applications = database_resources.setdefault(database_key, set())
                        if application_id is not None:
                            database_applications.add(UUID(str(application_id)))

    # A full cluster reset removes every namespace outside the Kubernetes and provider baseline.
    if reset_cluster:
        async for namespace_resource in Namespace.list(api=api):
            if namespace_resource.name not in protected_namespaces:
                managed_namespaces.add(namespace_resource.name)

    # Recover orphan provider identities from current and legacy Kubernetes runtime Secrets.
    existing_namespaces: set[str] = set()
    for namespace in sorted(managed_namespaces):
        namespace_resource = Namespace(namespace, api=api)
        if not await namespace_resource.exists():
            continue
        existing_namespaces.add(namespace)
        if namespace == "longlink-system":
            continue

        # Recognize LongLink Organization namespaces even when they contain no surviving runtime Secret.
        policy = NetworkPolicy("longlink-gateway-ingress", namespace=namespace, api=api)
        if await policy.exists():
            provider_namespaces.add(namespace)
        async for secret in Secret.list(api=api, namespace=namespace):
            values = secret_values(secret)
            runtime_names = (
                "LONGLINK_DATABASE_NAME",
                "LONGLINK_DATABASE_SCHEMA",
                "LONGLINK_STORAGE_BUCKET",
                "LONGLINK_STORAGE_ENDPOINT_URL",
            )
            if not any(name in values for name in runtime_names):
                continue
            if not all(values.get(name, "").strip() for name in runtime_names):
                raise RuntimeError(f"Kubernetes runtime Secret '{namespace}/{secret.name}' has incomplete cleanup identity")

            # Require runtime database and storage identities to describe one Organization.
            try:
                database_organization = UUID(values["LONGLINK_DATABASE_NAME"])
                storage_organization = UUID(values["LONGLINK_STORAGE_BUCKET"])
                application = UUID(values["LONGLINK_DATABASE_SCHEMA"])
            except ValueError:
                raise RuntimeError(f"Kubernetes runtime Secret '{namespace}/{secret.name}' has invalid resource IDs") from None
            if database_organization != storage_organization:
                raise RuntimeError(f"Kubernetes runtime Secret '{namespace}/{secret.name}' crosses Organization resources")
            organization = database_organization
            provider_namespaces.add(namespace)
            namespace_organizations.setdefault(namespace, set()).add(organization)

            # Refuse to use current provisioning credentials against a different runtime provider.
            runtime_database = (
                values.get("LONGLINK_DATABASE_HOST", ""),
                values.get("LONGLINK_DATABASE_PORT", ""),
                values.get("LONGLINK_DATABASE_SSLMODE", ""),
            )
            configured_database_identity = (
                configured_database.host,
                str(configured_database.port),
                configured_database.sslmode.value,
            )
            if runtime_database != configured_database_identity:
                raise RuntimeError(
                    f"Kubernetes runtime Secret '{namespace}/{secret.name}' uses a different Application database"
                )
            if values["LONGLINK_STORAGE_ENDPOINT_URL"] != settings.EXOSCALE_STORAGE_ENDPOINT_URL:
                raise RuntimeError(f"Kubernetes runtime Secret '{namespace}/{secret.name}' uses a different storage endpoint")

            # Add orphan resources under the configured provider provisioning identities.
            database_key = (
                configured_database.host,
                configured_database.port,
                configured_database.username,
                configured_database.password,
                configured_database.sslmode,
                organization,
            )
            database_resources.setdefault(database_key, set()).add(application)
            storage_key = (
                settings.EXOSCALE_STORAGE_ENDPOINT_URL,
                settings.EXOSCALE_API_KEY,
                settings.EXOSCALE_API_SECRET,
                organization,
            )
            storage_resources.setdefault(storage_key, set()).add(application)

    # Never report a clean provider state when an Organization namespace cannot be mapped to its resources.
    unresolved_namespaces = sorted(
        namespace
        for namespace in existing_namespaces
        if namespace in provider_namespaces and not namespace_organizations.get(namespace)
    )
    if unresolved_namespaces:
        names = ", ".join(unresolved_namespaces)
        raise RuntimeError(f"Cannot identify provider resources for managed Kubernetes namespaces: {names}")

    # Stop all managed workloads before revoking the credentials they can consume.
    removed_namespaces = len(existing_namespaces)
    for namespace in sorted(existing_namespaces):
        resource = Namespace(namespace, api=api)
        await resource.delete()
    try:
        async with asyncio.timeout(10 * 60):
            while existing_namespaces:
                remaining = {
                    namespace
                    for namespace in existing_namespaces
                    if await Namespace(namespace, api=api).exists()
                }
                if not remaining:
                    break
                existing_namespaces = remaining
                await asyncio.sleep(5)
    except TimeoutError:
        names = ", ".join(sorted(existing_namespaces))
        raise RuntimeError(f"Kubernetes namespaces did not terminate: {names}") from None

    # Confirm a full reset did not leave or concurrently acquire a non-system namespace.
    if reset_cluster:
        remaining_namespaces = [
            namespace_resource.name
            async for namespace_resource in Namespace.list(api=api)
            if namespace_resource.name not in protected_namespaces
        ]
        remaining_namespaces.sort()
        if remaining_namespaces:
            names = ", ".join(remaining_namespaces)
            raise RuntimeError(f"Non-system Kubernetes namespaces remain: {names}")

    # Revoke Application credentials before emptying and deleting each Organization bucket.
    for (endpoint_url, access_key_id, secret_access_key, organization), application_ids in storage_resources.items():
        storage = adapters.Exoscale(endpoint_url, access_key_id, secret_access_key)
        for application in application_ids:
            await storage.revoke(application.hex)
        await storage.delete(organization.hex)

        # Verify both IAM and object-storage resources are absent before clearing Platform state.
        remaining_credentials = [
            application for application in application_ids if await storage.credentials_exist(application.hex)
        ]
        if remaining_credentials:
            names = ", ".join(str(application) for application in sorted(remaining_credentials))
            raise RuntimeError(f"Exoscale Application credentials remain: {names}")
        if await storage.usage(organization.hex) is not None:
            raise RuntimeError(f"Exoscale Organization bucket remains: {organization}")

    # Remove Application schemas and roles before deleting each Organization database.
    for (host, port, username, password, sslmode, organization), application_ids in database_resources.items():
        database = adapters.Postgres(host, port, username, password, sslmode)
        for application in application_ids:
            await database.delete_schema(organization, application)
        await database.delete_database(organization)

        # Verify the database and every cluster-global runtime role are absent.
        remaining_roles = [
            application for application in application_ids if await database.application_role_exists(organization, application)
        ]
        if remaining_roles:
            names = ", ".join(str(application) for application in sorted(remaining_roles))
            raise RuntimeError(f"PostgreSQL Application roles remain: {names}")
        if await database.database_usage(organization.hex) is not None:
            raise RuntimeError(f"PostgreSQL Organization database remains: {organization}")

    # Remove stale Platform lifecycle and registry state only after external cleanup is verified.
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
    if platform_tables:
        async with session_scope() as session:
            for table in cleanup_order:
                if table in platform_tables:
                    await session.execute(text(f"DELETE FROM {table}"))
            await session.commit()

    print(
        f"Removed and verified {removed_namespaces} Kubernetes namespaces, "
        f"{len(database_resources)} database resources, and {len(storage_resources)} storage resources."
    )


def main() -> None:
    """Clean the configured seed resources from a synchronous entrypoint."""

    # Make destructive whole-cluster cleanup an explicit command-line choice.
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--reset-cluster",
        action="store_true",
        help="remove every non-system namespace in addition to tracked LongLink resources",
    )
    args = parser.parse_args()

    # Keep the command-line boundary separate from asynchronous provider cleanup.
    asyncio.run(cleanup(reset_cluster=args.reset_cluster))


if __name__ == "__main__":
    main()
