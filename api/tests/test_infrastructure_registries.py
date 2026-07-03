import pytest
from uuid import UUID
from datetime import UTC, datetime
from src.errors import NotFoundError, UnavailableError
from src.routes import computes, storages, databases, locations
from src.models.computes import (ComputeKind, ComputeRegistryCreate,
                                 ComputeRegistryResponse)
from src.models.storages import (StorageKind, StorageRegistryCreate,
                                 StorageRegistryResponse)
from src.models.countries import Country
from src.models.databases import (DatabaseKind, DatabaseRegistryCreate,
                                  DatabaseRegistryResponse)
from src.models.locations import (LocationCreate, LocationProvider,
                                  LocationResponse)
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.storages import StorageRegistry
from src.database.models.databases import DatabaseRegistry
from src.database.models.locations import Location

pytestmark = pytest.mark.no_db


def user() -> User:
    """Build one user for direct registry route calls."""

    return User(
        id=UUID("11111111-1111-1111-1111-111111111111"),
        oidc="admin",
        email="admin@example.com",
        name="Admin User",
        avatar="",
    )


def location() -> Location:
    """Build one location model."""

    actor = user()
    return Location(
        id=UUID("22222222-2222-2222-2222-222222222222"),
        name="Local",
        slug="local",
        country=Country.CH,
        provider=LocationProvider.local,
        created_by=actor,
        updated_by=actor,
    )


def compute_registry() -> ComputeRegistry:
    """Build one compute registry model."""

    actor = user()
    return ComputeRegistry(
        id=UUID("33333333-3333-3333-3333-333333333333"),
        kind=ComputeKind.kubernetes,
        name="primary",
        slug="primary",
        kubeconfig="apiVersion: v1\nclusters: []\n",
        ingress_host="apps.example.test",
        ingress_name="longlink-proxy",
        proxy_secret="proxy-secret",
        location_id=location().id,
        created_by=actor,
        updated_by=actor,
    )


def database_registry() -> DatabaseRegistry:
    """Build one database registry model."""

    actor = user()
    return DatabaseRegistry(
        id=UUID("44444444-4444-4444-4444-444444444444"),
        kind=DatabaseKind.postgresql,
        name="primary",
        slug="primary",
        host="db.control.example.test",
        port=5432,
        username="longlink",
        password="secret",
        runtime_host="db.runtime.example.test",
        runtime_port=15432,
        location_id=location().id,
        created_by=actor,
        updated_by=actor,
    )


def storage_registry() -> StorageRegistry:
    """Build one storage registry model."""

    actor = user()
    return StorageRegistry(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        kind=StorageKind.s3,
        name="object-store",
        slug="object-store",
        protocol="https",
        endpoint_url="https://storage.control.example.test",
        access_key_id="access-key",
        secret_access_key="secret-key",
        runtime_endpoint_url="https://storage.runtime.example.test",
        location_id=location().id,
        created_by=actor,
        updated_by=actor,
    )


async def test_location_routes_and_provider_values(monkeypatch: pytest.MonkeyPatch) -> None:
    """List, get, create, and delete locations with supported provider values."""

    actor = user()
    registry_location = location()
    created_locations: list[tuple[str, str, Country, LocationProvider]] = []

    async def fake_list() -> list[Location]:
        """Return registered locations."""

        return [registry_location]

    async def fake_get(location_id: UUID) -> Location:
        """Return one location by id."""

        assert location_id == registry_location.id
        return registry_location

    async def fake_create(
        slug: str,
        name: str,
        actor: User,
        country: Country,
        provider: LocationProvider,
    ) -> Location:
        """Record location creation."""

        created_locations.append((slug, name, country, provider))
        return registry_location

    async def fake_delete(location_id: UUID, actor: User) -> bool:
        """Delete one location."""

        assert location_id == registry_location.id
        return True

    monkeypatch.setattr(locations.locations, "list", fake_list)
    monkeypatch.setattr(locations.locations, "get", fake_get)
    monkeypatch.setattr(locations.locations, "create", fake_create)
    monkeypatch.setattr(locations.locations, "delete", fake_delete)

    assert [provider.value for provider in LocationProvider] == [
        "local",
        "infomaniak",
        "ovh",
        "scaleway",
        "hetzner",
        "exoscale",
    ]
    assert await locations.list_locations(actor) == [LocationResponse.model_validate(registry_location)]
    assert await locations.get_location(registry_location.id, actor) == LocationResponse.model_validate(registry_location)
    assert await locations.create_location(
        LocationCreate(name="Local", country=Country.CH, provider=LocationProvider.local),
        actor,
    ) == LocationResponse.model_validate(registry_location)
    assert created_locations == [("local", "Local", Country.CH, LocationProvider.local)]
    assert (await locations.delete_location(registry_location.id, actor)).status_code == 204


async def test_compute_registry_routes_and_inspection(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create compute registries and inspect cluster resources, namespaces, and pods."""

    actor = user()
    registry = compute_registry()
    setup_calls: list[tuple[str, str]] = []

    async def fake_list() -> list[ComputeRegistry]:
        """Return compute registries."""

        return [registry]

    async def fake_get(registry_id: UUID) -> ComputeRegistry:
        """Return one compute registry."""

        assert registry_id == registry.id
        return registry

    async def fake_create(**kwargs) -> ComputeRegistry:
        """Return a newly created compute registry."""

        assert kwargs["user"] is actor
        return registry

    async def fake_delete(registry_id: UUID, actor: User) -> bool:
        """Delete one compute registry."""

        assert registry_id == registry.id
        return True

    class FakeK8s:
        """Fake Kubernetes adapter for route tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Store constructor inputs."""

            setup_calls.append((kubeconfig, proxy_secret))

        async def setup(self) -> None:
            """Record successful setup."""

        async def resources(self) -> dict[str, int | float]:
            """Return cluster resources."""

            return {"ram_total": 4096, "ram_free": 2048, "cpu_total": 2.0, "cpu_free": 1.0}

        async def namespaces(self) -> list[str]:
            """Return managed namespaces."""

            return ["longlink-acme"]

        async def pods(self, namespace: str) -> list[dict[str, object]]:
            """Return namespace pods."""

            assert namespace == "longlink-acme"
            return [
                {
                    "name": "dashboard",
                    "status": "Running",
                    "node": "node-1",
                    "created_at": "2026-07-01T00:00:00+00:00",
                    "resources": {"cpu_limit": 1.0, "ram_limit": 512, "cpu_usage": 0.1, "ram_usage": 128},
                }
            ]

    monkeypatch.setattr(computes.compute, "list", fake_list)
    monkeypatch.setattr(computes.compute, "get", fake_get)
    monkeypatch.setattr(computes.compute, "create", fake_create)
    monkeypatch.setattr(computes.compute, "delete", fake_delete)
    monkeypatch.setattr(computes, "K8s", FakeK8s)

    assert await computes.list_compute_registries(actor) == [ComputeRegistryResponse.model_validate(registry)]
    assert await computes.get_compute_registry(registry.id, actor) == ComputeRegistryResponse.model_validate(registry)
    assert await computes.create_compute_registry(
        ComputeRegistryCreate(
            kind=ComputeKind.kubernetes,
            name="primary",
            kubeconfig=registry.kubeconfig,
            ingress_host=registry.ingress_host,
            location_id=registry.location_id,
        ),
        actor,
    ) == ComputeRegistryResponse.model_validate(registry)
    assert setup_calls == [(registry.kubeconfig, registry.proxy_secret)]
    assert (await computes.delete_compute_registry(registry.id, actor)).status_code == 204
    assert (await computes.get_compute_resources(registry.id, actor)).model_dump() == {
        "ram_total": 4096,
        "ram_free": 2048,
        "cpu_total": 2.0,
        "cpu_free": 1.0,
    }
    assert [item.name for item in await computes.list_compute_namespaces(registry.id, actor)] == ["longlink-acme"]
    pods = await computes.list_namespace_pods(registry.id, "longlink-acme", actor)
    assert pods[0].name == "dashboard"
    assert pods[0].resources is not None
    assert pods[0].resources.ram_usage == 128


async def test_compute_create_reports_unavailable_setup(monkeypatch: pytest.MonkeyPatch) -> None:
    """Surface compute setup failures as unavailable errors."""

    actor = user()
    registry = compute_registry()

    async def fake_create(**kwargs) -> ComputeRegistry:
        """Return a created registry before setup fails."""

        return registry

    class FailingK8s:
        """Failing Kubernetes adapter."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Accept constructor inputs."""

        async def setup(self) -> None:
            """Fail cluster setup."""

            raise RuntimeError("cluster unavailable")

    monkeypatch.setattr(computes.compute, "create", fake_create)
    monkeypatch.setattr(computes, "K8s", FailingK8s)

    with pytest.raises(UnavailableError, match="Failed to initialize the compute cluster"):
        await computes.create_compute_registry(
            ComputeRegistryCreate(
                kind=ComputeKind.kubernetes,
                name="primary",
                kubeconfig=registry.kubeconfig,
                ingress_host=registry.ingress_host,
                location_id=registry.location_id,
            ),
            actor,
        )


async def test_database_registry_routes_and_inspection(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create database registries and inspect databases, schemas, and usage."""

    actor = user()
    registry = database_registry()

    async def fake_list() -> list[DatabaseRegistry]:
        """Return database registries."""

        return [registry]

    async def fake_get(registry_id: UUID) -> DatabaseRegistry:
        """Return one database registry."""

        assert registry_id == registry.id
        return registry

    async def fake_create(**kwargs) -> DatabaseRegistry:
        """Return a created database registry."""

        assert kwargs["runtime_host"] == registry.runtime_host
        assert kwargs["runtime_port"] == registry.runtime_port
        assert kwargs["user"] is actor
        return registry

    async def fake_delete(registry_id: UUID, actor: User) -> bool:
        """Delete one database registry."""

        assert registry_id == registry.id
        return True

    class FakePostgres:
        """Fake PostgreSQL adapter for inspection routes."""

        def __init__(self, host: str, port: int, username: str, password: str) -> None:
            """Store connection inputs."""

            assert (host, port, username, password) == (
                registry.host,
                registry.port,
                registry.username,
                registry.password,
            )

        async def databases(self) -> list[str]:
            """Return backend database names."""

            return ["longlink_acme"]

        async def schemas(self, database_name: str) -> list[str]:
            """Return backend schema names."""

            assert database_name == "longlink_acme"
            return ["public", "dashboard"]

        async def usage(self) -> dict[str, int]:
            """Return aggregate backend storage usage."""

            return {"space_used": 123456}

    monkeypatch.setattr(databases.database, "list", fake_list)
    monkeypatch.setattr(databases.database, "get", fake_get)
    monkeypatch.setattr(databases.database, "create", fake_create)
    monkeypatch.setattr(databases.database, "delete", fake_delete)
    monkeypatch.setattr(databases, "Postgres", FakePostgres)

    assert await databases.list_database_registries(actor) == [DatabaseRegistryResponse.model_validate(registry)]
    assert await databases.get_database_registry(registry.id, actor) == DatabaseRegistryResponse.model_validate(registry)
    assert await databases.create_database_registry(
        DatabaseRegistryCreate(
            kind=DatabaseKind.postgresql,
            name=registry.name,
            host=registry.host,
            port=registry.port,
            username=registry.username,
            password=registry.password,
            runtime_host=registry.runtime_host,
            runtime_port=registry.runtime_port,
            location_id=registry.location_id,
        ),
        actor,
    ) == DatabaseRegistryResponse.model_validate(registry)
    assert (await databases.delete_database_registry(registry.id, actor)).status_code == 204
    assert [item.name for item in await databases.list_database_databases(registry.id, actor)] == ["longlink_acme"]
    schemas = await databases.list_database_schemas(registry.id, "longlink_acme", actor)
    assert [item.name for item in schemas] == ["public", "dashboard"]
    assert await databases.get_database_usage(registry.id, actor) == databases.DatabaseUsageResponse(space_used=123456)


async def test_storage_registry_routes_redaction_and_inspection(monkeypatch: pytest.MonkeyPatch) -> None:
    """Create storage registries, redact secrets, and inspect buckets and objects."""

    actor = user()
    registry = storage_registry()
    captured_limits: list[int] = []

    async def fake_list() -> list[StorageRegistry]:
        """Return storage registries."""

        return [registry]

    async def fake_get(registry_id: UUID) -> StorageRegistry:
        """Return one storage registry."""

        assert registry_id == registry.id
        return registry

    async def fake_create(**kwargs) -> StorageRegistry:
        """Return a created storage registry."""

        assert kwargs["runtime_endpoint_url"] == registry.runtime_endpoint_url
        assert kwargs["user"] is actor
        return registry

    async def fake_delete(registry_id: UUID, actor: User) -> bool:
        """Delete one storage registry."""

        assert registry_id == registry.id
        return True

    class FakeS3:
        """Fake S3 adapter for storage inspection routes."""

        def __init__(self, protocol: str, endpoint_url: str, access_key_id: str, secret_access_key: str) -> None:
            """Store connection inputs."""

            assert (protocol, endpoint_url, access_key_id, secret_access_key) == (
                registry.protocol,
                registry.endpoint_url,
                registry.access_key_id,
                registry.secret_access_key,
            )

        async def buckets(self) -> list[str]:
            """Return storage bucket names."""

            return ["alpha", "beta"]

        async def objects(self, bucket_name: str, *, limit: int = 1000) -> list[dict[str, object]]:
            """Return object metadata."""

            assert bucket_name == "alpha"
            captured_limits.append(limit)
            return [
                {
                    "key": "reports/july.csv",
                    "size": 123,
                    "etag": '"abc123"',
                    "last_modified": datetime(2026, 7, 1, tzinfo=UTC),
                }
            ]

    monkeypatch.setattr(storages.storage, "list", fake_list)
    monkeypatch.setattr(storages.storage, "get", fake_get)
    monkeypatch.setattr(storages.storage, "create", fake_create)
    monkeypatch.setattr(storages.storage, "delete", fake_delete)
    monkeypatch.setattr(storages, "S3", FakeS3)

    assert await storages.list_storage_registries(actor) == [StorageRegistryResponse.model_validate(registry)]
    assert await storages.get_storage_registry(registry.id, actor) == StorageRegistryResponse.model_validate(registry)
    assert await storages.create_storage_registry(
        StorageRegistryCreate(
            kind=StorageKind.s3,
            name=registry.name,
            protocol=registry.protocol,
            endpoint_url=registry.endpoint_url,
            runtime_endpoint_url=registry.runtime_endpoint_url,
            access_key_id=registry.access_key_id,
            secret_access_key=registry.secret_access_key,
            location_id=registry.location_id,
        ),
        actor,
    ) == StorageRegistryResponse.model_validate(registry)
    assert (await storages.delete_storage_registry(registry.id, actor)).status_code == 204

    response_payload = StorageRegistryResponse.model_validate(registry).model_dump()
    assert response_payload["access_key_id"] == "access-key"
    assert "secret_access_key" not in response_payload

    assert [item.name for item in await storages.list_storage_buckets(registry.id, actor)] == ["alpha", "beta"]
    objects = await storages.list_storage_bucket_objects(registry.id, "alpha", actor)
    assert captured_limits == [storages.STORAGE_OBJECT_LIST_LIMIT]
    assert storages.STORAGE_OBJECT_LIST_LIMIT == 1000
    assert objects[0].key == "reports/july.csv"


async def test_registry_get_routes_raise_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return not-found errors when registry records are missing."""

    missing_id = UUID("66666666-6666-6666-6666-666666666666")
    actor = user()

    async def missing(registry_id: UUID):
        """Return no registry."""

        return None

    monkeypatch.setattr(computes.compute, "get", missing)
    monkeypatch.setattr(databases.database, "get", missing)
    monkeypatch.setattr(storages.storage, "get", missing)
    monkeypatch.setattr(locations.locations, "get", missing)

    with pytest.raises(NotFoundError, match=f"Location '{missing_id}' not found"):
        await locations.get_location(missing_id, actor)

    with pytest.raises(NotFoundError, match=f"Compute registry '{missing_id}' not found"):
        await computes.get_compute_registry(missing_id, actor)

    with pytest.raises(NotFoundError, match=f"Database registry '{missing_id}' not found"):
        await databases.get_database_registry(missing_id, actor)

    with pytest.raises(NotFoundError, match=f"Storage registry '{missing_id}' not found"):
        await storages.get_storage_registry(missing_id, actor)
