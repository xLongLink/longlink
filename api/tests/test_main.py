import main
import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.no_db

def test_static_web_bundle_serves_root() -> None:
    """Serve the built API web bundle at the root path."""

    response = TestClient(main.app).get("/")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_versioned_openapi_describes_only_v1_paths() -> None:
    """Expose the v1 API document with only v1 paths."""

    client = TestClient(main.app)

    # Read the versioned contract document.
    openapi_response = client.get("/api/v1/openapi.json")

    assert openapi_response.status_code == 200
    assert openapi_response.json()["info"]["version"] == "1.0.0"
    assert all(path.startswith("/api/v1/") for path in openapi_response.json()["paths"])
