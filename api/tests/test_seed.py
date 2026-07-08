import seed
import pytest
from uuid import UUID

pytestmark = pytest.mark.no_db


class FakeResponse:
    """Minimal response object for seed script tests."""

    def __init__(self, payload: object | None = None, status_code: int = 200) -> None:
        """Store fake response data."""

        self._payload = payload
        self.status_code = status_code
        self.text = str(payload)

    def json(self) -> object:
        """Return the configured payload."""

        return self._payload

    def raise_for_status(self) -> None:
        """Raise when the fake response represents an error."""

        if self.status_code >= 400:
            raise AssertionError(f"Unexpected HTTP {self.status_code}: {self.text}")


class FakeSeedClient:
    """Record seed script requests and return deterministic resources."""

    user_id = "11111111-1111-1111-1111-111111111111"
    location_id = "22222222-2222-2222-2222-222222222222"
    organization_id = "33333333-3333-3333-3333-333333333333"
    application_id = "44444444-4444-4444-4444-444444444444"

    def __init__(self, app: object, *, existing: bool = False) -> None:
        """Store the fake app reference and existing-resource mode."""

        self.app = app
        self.posts: list[tuple[str, dict[str, object]]] = []
        self.existing = existing

    def get(self, path: str) -> FakeResponse:
        """Return fake list/detail responses for seed reads."""

        if path == "/api/locations":
            payload = [{"id": self.location_id, "slug": "local"}] if self.existing else []
            return FakeResponse(payload)

        if path == "/api/databases":
            payload = [{"name": "local"}] if self.existing else []
            return FakeResponse(payload)

        if path == "/api/storages":
            payload = [{"name": "local"}] if self.existing else []
            return FakeResponse(payload)

        if path == "/api/computes":
            payload = [{"ingress_host": seed.LOCAL_COMPUTE_INGRESS_HOST}] if self.existing else []
            return FakeResponse(payload)

        if path == "/api/organizations":
            payload = [{"id": self.organization_id, "name": seed.LOCAL_ORG}] if self.existing else []
            return FakeResponse(payload)

        if path == f"/api/organizations/{self.organization_id}/applications":
            payload = [{"id": self.application_id, "name": seed.LOCAL_APP["name"]}] if self.existing else []
            return FakeResponse(payload)

        raise AssertionError(f"Unexpected GET {path}")

    def post(self, path: str, json: dict[str, object]) -> FakeResponse:
        """Record fake write requests and return created resources."""

        self.posts.append((path, json))

        if path == "/api/locations":
            return FakeResponse({"id": self.location_id, "slug": json["slug"]})

        if path == "/api/databases":
            return FakeResponse({"id": "database-registry-id", **json})

        if path == "/api/storages":
            return FakeResponse({"id": "storage-registry-id", **json})

        if path == "/api/computes":
            return FakeResponse({"id": "compute-registry-id", **json})

        if path == "/api/organizations":
            return FakeResponse({"id": self.organization_id, **json})

        if path == f"/api/organizations/{self.organization_id}/applications":
            return FakeResponse({"id": self.application_id, **json})

        raise AssertionError(f"Unexpected POST {path}")


def test_seed_main_creates_local_resources(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    """Seed local resources through public API routes."""

    kubeconfig = tmp_path / "kubeconfig.yaml"
    kubeconfig.write_text("apiVersion: v1\nclusters: []\n", encoding="utf-8")
    client = FakeSeedClient(app=object())

    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "TestClient", lambda app: client)
    monkeypatch.setattr(seed, "login_seed_administrator", lambda seed_client: UUID(FakeSeedClient.user_id))

    seed.main()

    posts = dict(client.posts)
    assert posts["/api/databases"] == {
        "kind": "postgresql",
        "name": "local",
        "host": "localhost",
        "port": 15432,
        "username": "admin",
        "password": "admin",
        "location_id": FakeSeedClient.location_id,
    }
    assert posts["/api/storages"] == {
        "kind": "s3",
        "name": "local",
        "protocol": "http",
        "endpoint_url": "http://localhost:19000",
        "runtime_endpoint_url": "http://host.k3d.internal:19000",
        "access_key_id": "admin",
        "secret_access_key": "adminadmin",
        "location_id": FakeSeedClient.location_id,
    }
    assert posts["/api/computes"] == {
        "kind": "kubernetes",
        "name": "local",
        "kubeconfig": "apiVersion: v1\nclusters: []\n",
        "ingress_host": seed.LOCAL_COMPUTE_INGRESS_HOST,
        "location_id": FakeSeedClient.location_id,
    }
    assert posts[f"/api/organizations/{FakeSeedClient.organization_id}/applications"] == seed.LOCAL_APP


def test_seed_main_refreshes_existing_application_runtime(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    """Refresh the local application runtime when the seeded app already exists."""

    kubeconfig = tmp_path / "kubeconfig.yaml"
    kubeconfig.write_text("apiVersion: v1\nclusters: []\n", encoding="utf-8")
    client = FakeSeedClient(app=object(), existing=True)
    sync_calls: list[tuple[UUID, UUID, UUID]] = []

    async def fake_sync_local_application(application_id: UUID, organization_id: UUID, user_id: UUID) -> None:
        """Record the application runtime refresh request."""

        sync_calls.append((application_id, organization_id, user_id))

    monkeypatch.setattr(seed, "KUBECONFIG", kubeconfig)
    monkeypatch.setattr(seed, "TestClient", lambda app: client)
    monkeypatch.setattr(seed, "login_seed_administrator", lambda seed_client: UUID(FakeSeedClient.user_id))
    monkeypatch.setattr(seed, "sync_local_application", fake_sync_local_application)

    seed.main()

    assert sync_calls == [
        (
            UUID(FakeSeedClient.application_id),
            UUID(FakeSeedClient.organization_id),
            UUID(FakeSeedClient.user_id),
        )
    ]
