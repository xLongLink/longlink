from longlink.testing import TestClient


def test_healthcheck_returns_ok_payload() -> None:
    """Return the LongLink runtime health payload."""

    # Arrange
    from main import app

    client = TestClient(app)

    # Act
    response = client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}
