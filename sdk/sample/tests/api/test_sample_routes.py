from fastapi import FastAPI
from src.api.sample import router as sample_router
from fastapi.testclient import TestClient

app = FastAPI()
app.include_router(sample_router)

client = TestClient(app)


def test_sample_get_endpoint_returns_expected_message() -> None:
    """Ensure GET /sample returns the current filesystem metadata."""
    response = client.get("/sample")

    assert response.status_code == 200
    assert response.json()["message"] == "Sample GET endpoint received data"
    assert response.json()["filesystem_protocol"] == "file"
    assert response.json()["filesystem_type"] == "FakeFilesystem"


def test_sample_user_endpoint_returns_typed_payload() -> None:
    """Ensure POST /sample/user returns the typed user payload."""
    response = client.post("/sample/user")

    payload = response.json()

    assert response.status_code == 200
    assert payload["id"] == 1
    assert payload["username"] == "testuser"
    assert payload["email"] == "testuser@example.com"
    assert payload["is_active"] is True
    assert payload["age"] == 30
    assert "created_at" in payload


def test_sample_post_endpoint_persists_files_and_returns_metadata() -> None:
    """Ensure POST /sample writes the sample file and returns file metadata."""

    response = client.post("/sample")

    assert response.status_code == 200
    payload = response.json()
    assert payload["message"] == "Sample POST endpoint saved data to filesystem and database"
    assert payload["filesystem_path"].startswith("sample-projects/")
    assert payload["filesystem_path"].endswith(".txt")
