from fastapi.testclient import TestClient


async def test_create_location_accepts_iso_country_code(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Accept a valid ISO 3166-1 alpha-2 country code."""

    # Arrange
    client = clients[0]

    # Act
    response = client.post(
        "/api/locations",
        json={"name": "Local testing", "slug": "local", "country": "DE"},
    )

    # Assert
    assert response.status_code == 200
    assert response.json()["name"] == "Local testing"
    assert response.json()["slug"] == "local"
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
        json={"name": "Local testing", "slug": "local", "country": "DE"},
    )

    # Act
    response = client.get("/api/locations")

    # Assert
    assert create_response.status_code == 200
    assert response.status_code == 200
    assert response.json()[0]["name"] == "Local testing"
    assert response.json()[0]["slug"] == "local"
    assert response.json()[0]["country"] == "DE"
    assert "compute_registries" not in response.json()[0]
    assert "database_registries" not in response.json()[0]
    assert "storage_registries" not in response.json()[0]


async def test_create_location_rejects_unknown_iso_country_code(
    clients: tuple[TestClient, TestClient, TestClient],
) -> None:
    """Reject a country code outside the ISO 3166-1 alpha-2 set."""

    # Arrange
    client = clients[0]

    # Act
    response = client.post(
        "/api/locations",
        json={"name": "Local testing", "slug": "local", "country": "ZZ"},
    )

    # Assert
    assert response.status_code == 422
