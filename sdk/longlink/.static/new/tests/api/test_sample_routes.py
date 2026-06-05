from io import BytesIO
from fastapi import FastAPI
from src.api import sample as sample_api
from contextlib import contextmanager
from fastapi.testclient import TestClient


class FakeSessionContext:
    """Async context manager matching SQLAlchemy sessionmaker behavior."""

    def __init__(self, session: object) -> None:
        """Store the session object for later reuse."""

        self._session = session

    async def __aenter__(self) -> object:
        """Return a fake session for the route service call."""

        return self._session

    async def __aexit__(self, exc_type: object, exc: object, traceback: object) -> None:
        """Close the fake session context."""

        return None


class FakeSession:
    """Minimal async session double for the showcase route."""

    def __init__(self) -> None:
        """Track session interactions for assertions."""

        self.added = []
        self.committed = False
        self.refreshed = []

    def add(self, item: object) -> None:
        """Record added items."""

        self.added.append(item)

    async def commit(self) -> None:
        """Mark the fake transaction as committed."""

        self.committed = True

    async def refresh(self, item: object) -> None:
        """Record refreshed items."""

        self.refreshed.append(item)


class FakeStorage:
    """In-memory storage double for filesystem writes."""

    protocol = "memory"

    def __init__(self) -> None:
        """Collect file writes by path."""

        self.writes = {}

    @contextmanager
    def open(self, path: str, mode: str):
        """Capture bytes written by the route."""

        buffer = BytesIO()
        yield buffer
        self.writes[path] = buffer.getvalue().decode("utf-8")


app = FastAPI()
app.include_router(sample_api.router)

client = TestClient(app)


def test_sample_get_endpoint_returns_expected_message() -> None:
    """Ensure GET /sample returns the current filesystem metadata."""

    response = client.get("/sample")

    assert response.status_code == 200
    assert response.json()["message"] == "Sample GET endpoint received data"
    assert response.json()["sample"] == "sample"
    assert response.json()["filesystem_protocol"] == "abstract"
    assert response.json()["filesystem_type"] == "Storage"


def test_sample_post_endpoint_returns_typed_payload_and_persists_data(monkeypatch) -> None:
    """Ensure POST /sample writes data and returns the typed payload."""

    fake_storage = FakeStorage()
    monkeypatch.setattr(sample_api, "fs", fake_storage)

    fake_session = FakeSession()

    def fake_session_maker() -> FakeSessionContext:
        """Return the fake session context manager."""

        return FakeSessionContext(fake_session)

    app.dependency_overrides[sample_api.db.get_session] = lambda: fake_session_maker

    try:
        response = client.post("/sample")
    finally:
        app.dependency_overrides.clear()

    payload = response.json()

    assert response.status_code == 200
    assert payload["id"] == 1
    assert payload["username"] == "testuser"
    assert payload["email"] == "testuser@example.com"
    assert "created_at" in payload
    assert fake_session.committed is True
    assert fake_storage.writes == {"sample-projects/sample-project.txt": "Created project sample-project."}
