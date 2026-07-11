from types import SimpleNamespace
from fastapi.testclient import TestClient
from src.database.services import users, compute, locations

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
    location = await db.locations.create("local", "Local testing", user1, "CH")
    captured: dict[str, object] = {}

    class FakeCompute:
        """Fake Kubernetes compute client for registry route tests."""

        def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
            """Capture constructor arguments passed by the route."""

            captured["kubeconfig"] = kubeconfig
            captured["proxy_secret"] = proxy_secret

        async def setup(self) -> None:
            """Capture cluster setup calls."""

            setup_calls = captured.get("setup_calls")
            captured["setup_calls"] = setup_calls + 1 if isinstance(setup_calls, int) else 1

    monkeypatch.setattr("src.routes.computes.Kubernetes", FakeCompute)

    # Act
    create_response = client.post(
        "/api/computes",
        json={
            "name": "primary",
            "kubeconfig": "apiVersion: v1\nclusters: []\n",
            "gateway_url": "https://apps.longlink.internal",
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
    assert create_payload["gateway_url"] == "https://apps.longlink.internal"
    assert "gateway_load_balancer_ip" not in create_payload
    assert "kind" not in create_payload
    assert "kubeconfig" not in create_payload
    assert list_response.status_code == 200
    assert [item["id"] for item in list_response.json()] == [registry_id]
    assert delete_response.status_code == 204
    assert get_response.status_code == 404
    assert captured["kubeconfig"] == "apiVersion: v1\nclusters: []\n"
    assert captured["proxy_secret"]
    assert captured["setup_calls"] == 1
