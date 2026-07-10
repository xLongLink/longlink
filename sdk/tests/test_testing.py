from longlink import LongLink
from longlink.testing import TestClient


def test_testing_client_requests_longlink_runtime_route() -> None:
    """Request a LongLink app through the SDK test client."""

    # Arrange
    app = LongLink(i18n=None, pages=None)
    client = TestClient(app)

    # Act
    response = client.get("/health")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"ok": True}
