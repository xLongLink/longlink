from fastapi.testclient import TestClient


def test_list_icons_returns_lucide_icon_catalog(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return all valid Lucide icon slugs for UI selectors."""

    client = clients[0]

    response = client.get("/api/icons")

    assert response.status_code == 200
    icons = response.json()["icons"]
    assert "layout-grid" in icons
    assert "zoom-out" in icons


def test_create_application_rejects_invalid_icon(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Reject application creation payloads with unknown icon slugs."""

    client = clients[0]

    response = client.post(
        "/api/organizations/00000000-0000-0000-0000-000000000000/applications",
        json={
            "name": "dashboard",
            "icon": "not-a-real-icon",
            "image": "ghcr.io/longlink/dashboard:latest",
        },
    )

    assert response.status_code == 422
    assert "Icon must be a valid Lucide icon slug" in response.text
