from fastapi.testclient import TestClient
from src.models.locations import LocationProvider


async def test_create_location_accepts_iso_country_code(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Accept a valid ISO 3166-1 alpha-2 country code."""

    # Arrange
    client = clients[0]

    # Act
    response = client.post(
        "/api/locations",
        json={"name": "Local testing", "country": "DE", "provider": LocationProvider.infomaniak.value},
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["name"] == "Local testing"
    assert response.json()["slug"] == "local-testing"
    assert response.json()["country"] == "DE"
    assert "compute_registries" not in response.json()
    assert "database_registries" not in response.json()
    assert "storage_registries" not in response.json()


async def test_get_locations_returns_pure_location_payload(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Return locations without nested infrastructure aggregates."""

    # Arrange
    client = clients[0]
    create_response = client.post(
        "/api/locations",
        json={"name": "Local testing", "country": "DE"},
    )

    # Act
    response = client.get("/api/locations")

    # Assert
    assert create_response.status_code == 200
    assert response.status_code == 200
    assert response.json()[0]["name"] == "Local testing"
    assert response.json()[0]["slug"] == "local-testing"
    assert response.json()[0]["country"] == "DE"
    assert response.json()[0]["provider"] == LocationProvider.local.value
    assert "compute_registries" not in response.json()[0]
    assert "database_registries" not in response.json()[0]
    assert "storage_registries" not in response.json()[0]


async def test_delete_location_hides_location_from_public_reads(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Soft-delete a location and hide it from list/get routes."""

    # Arrange
    client = clients[0]
    create_response = client.post(
        "/api/locations",
        json={"name": "Local testing", "country": "DE"},
    )
    location_id = create_response.json()["id"]

    # Act
    delete_response = client.delete(f"/api/locations/{location_id}")
    get_response = client.get(f"/api/locations/{location_id}")
    list_response = client.get("/api/locations")

    # Assert
    assert create_response.status_code == 200
    assert delete_response.status_code == 204
    assert get_response.status_code == 404
    assert list_response.status_code == 200
    assert list_response.json() == []
