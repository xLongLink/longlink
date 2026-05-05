from fastapi import FastAPI
from src.api import sample as sample_api
from fastapi.testclient import TestClient


class FakeSessionContext:
    """Async context manager matching SQLAlchemy sessionmaker behavior."""

    async def __aenter__(self) -> object:
        """Return a fake session for the route service call."""

        return object()

    async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
        """Close the fake session context."""

        return None


def fake_session_maker() -> FakeSessionContext:
    """Return a fake async session context manager."""

    return FakeSessionContext()

app = FastAPI()
app.include_router(sample_api.router)

client = TestClient(app)


def test_sample_get_endpoint_returns_expected_message() -> None:
    """Ensure GET /sample returns the current filesystem metadata."""
    response = client.get("/sample")

    assert response.status_code == 200
    assert response.json()["message"] == "Sample GET endpoint received data"
    assert response.json()["filesystem_protocol"] == "abstract"
    assert response.json()["filesystem_type"] == "Storage"


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


def test_sample_post_endpoint_persists_files_and_returns_metadata(monkeypatch) -> None:
    """Ensure POST /sample writes the sample file and returns file metadata."""

    async def fake_create_project(session: object, project: object) -> object:
        """Return the project without touching a real database."""

        return project

    monkeypatch.setattr(sample_api, "create_project", fake_create_project)
    app.dependency_overrides[sample_api.db.get_session] = lambda: fake_session_maker

    response = client.post("/sample")

    app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["message"] == "Sample POST endpoint saved data to filesystem and database"
    assert payload["filesystem_path"].startswith("sample-projects/")
    assert payload["filesystem_path"].endswith(".txt")
