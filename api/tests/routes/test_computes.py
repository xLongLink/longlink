from types import SimpleNamespace
from fastapi.testclient import TestClient
from src.models.countries import Country
from src.database.services import users
from src.database.services import compute
from src.database.services import locations

db = SimpleNamespace(
    compute=compute,
    locations=locations,
    users=users,
)


async def test_compute_registry_endpoint_supports_create_and_list(
    clients: tuple[TestClient, TestClient, TestClient],
    monkeypatch,
    users,
) -> None:
    """Create, list, and delete one compute registry."""

    # Arrange
    client = clients[0]
    user1, _, _ = users
    location = await db.locations.create("local", "Local testing", user1, Country.CH)
    captured: dict[str, object] = {}

    class FakeCompute:
        def __init__(self, kubeconfig: str, proxy_secret: str, ingress_host: str) -> None:
            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret
            captured["ingress_host"] = ingress_host

        async def setup(self) -> None:
            captured["setup_calls"] = int(captured.get("setup_calls", 0)) + 1

    monkeypatch.setattr(
        "src.routes.computes.adapters.compute",
        lambda registry: FakeCompute(registry.kubeconfig, registry.proxy_secret, registry.ingress_host),
    )

    # Act
    create_response = client.post(
        "/api/computes",
        json={
            "kind": "kubernetes",
            "name": "primary",
            "kubeconfig": "apiVersion: v1\nclusters: []\n",
            "ingress_host": "apps.longlink.internal",
            "location_id": str(location.id),
        },
    )
    list_response = client.get("/api/computes")
    registry_id = create_response.json()["id"]
    delete_response = client.delete(f"/api/computes/{registry_id}")
    get_response = client.get(f"/api/computes/{registry_id}")

    # Assert
    assert create_response.status_code == 200
    create_payload = create_response.json()
    assert create_payload["id"] == registry_id
    assert create_payload["name"] == "primary"
    assert create_payload["ingress_host"] == "apps.longlink.internal"
    assert "kubeconfig" not in create_payload
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [registry_id]
    assert delete_response.status_code == 204
    assert get_response.status_code == 404
    assert captured["kubeconfig"] == "apiVersion: v1\nclusters: []\n"
    assert captured["proxy_secret"]
    assert captured["ingress_host"] == "apps.longlink.internal"
    assert captured["setup_calls"] == 1
