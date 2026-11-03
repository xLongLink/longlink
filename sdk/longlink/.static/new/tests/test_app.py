from main import app
from longlink.testclient import TestClient


def test_solution_serves_health_check() -> None:
    """Serve the LongLink runtime health check."""

    # Arrange
    client = TestClient(app)

    # Act
    with client:
        response = client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}
