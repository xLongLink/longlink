import pytest


@pytest.mark.unit
def test_list_storages_returns_connections(client, monkeypatch):
    """Storage route returns storage connections from service layer."""
    from src.routes import storage as storage_routes

    async def fake_list():
        """Return fake storage connections list."""
        return [
            {
                "name": "default",
                "endpoint_url": "http://localhost:9000",
                "region_name": None,
            }
        ]

    monkeypatch.setattr(storage_routes.db.storages, "list", fake_list)

    response = client.get("/storage")

    assert response.status_code == 200
    assert response.json() == [
        {
            "name": "default",
            "endpoint_url": "http://localhost:9000",
            "region_name": None,
        }
    ]
