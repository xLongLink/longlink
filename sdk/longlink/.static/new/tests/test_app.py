import pytest
from fastapi.testclient import TestClient


def test_application_serves_health_check(monkeypatch: pytest.MonkeyPatch) -> None:
    """Serve the LongLink runtime health check."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    from main import app

    client = TestClient(app)

    # Act
    response = client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}
