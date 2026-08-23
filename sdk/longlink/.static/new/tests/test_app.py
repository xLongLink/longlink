from main import app
from fastapi.testclient import TestClient


def test_application_serves_health_check() -> None:
    """Serve the LongLink runtime health check."""

    # Arrange
    client = TestClient(app)

    # Act
    response = client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}
