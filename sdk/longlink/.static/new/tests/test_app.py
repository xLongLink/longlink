from main import app
from longlink.testclient import TestClient

client = TestClient(app)


def test_solution_serves_health_check() -> None:
    """Serve the LongLink runtime health check."""

    # Act
    response = client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}
