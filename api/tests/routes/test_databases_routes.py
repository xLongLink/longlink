import pytest


@pytest.mark.unit
def test_list_database_overview_metrics_returns_metrics(client, monkeypatch):
    """Database overview route returns metrics from database service."""
    from src.routes import databases as databases_routes

    async def fake_list_overview_metrics():
        """Return fake overview metrics list."""
        return [
            {
                "key": "connections",
                "label": "Connections",
                "value": "7",
                "unit": None,
                "description": "active",
            }
        ]

    monkeypatch.setattr(databases_routes.db.databases, "list_overview_metrics", fake_list_overview_metrics)

    response = client.get("/databases/overview")

    assert response.status_code == 200
    assert response.json() == [
        {
            "key": "connections",
            "label": "Connections",
            "value": "7",
            "unit": None,
            "description": "active",
        }
    ]
