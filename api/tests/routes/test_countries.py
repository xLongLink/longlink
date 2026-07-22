from fastapi.testclient import TestClient


def test_list_countries_returns_sorted_country_options(clients: tuple[TestClient, TestClient, TestClient]) -> None:
    """Return sorted ISO country options for authenticated users."""

    # Act
    response = clients[0].get("/api/countries")

    # Assert
    assert response.status_code == 200
    countries = response.json()
    assert countries == sorted(countries, key=lambda item: item["name"])
    assert {"code": "CH", "name": "Switzerland"} in countries
    assert set(countries[0]) == {"code", "name"}
