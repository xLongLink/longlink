import pytest
from fastapi import FastAPI
from src.api import sample as sample_api
from contextlib import asynccontextmanager
from src.api.sample import router as sample_router
from fastapi.testclient import TestClient


class FakeFilesystem:
    """Minimal filesystem stub for sample route assertions."""

    protocol = 'file'


class FakeFileHandle:
    """Capture bytes written by the sample route."""

    def __init__(self) -> None:
        self.written = b""

    def write(self, data: bytes) -> int:
        """Store written bytes and report the byte count."""

        self.written = data
        return len(data)


class FakeFilesystemWithOpen(FakeFilesystem):
    """Filesystem stub that records open calls."""

    def __init__(self) -> None:
        self.protocol = "file"
        self.opened_paths: list[tuple[str, str]] = []
        self.file_handle = FakeFileHandle()

    def open(self, path: str, mode: str):
        """Return a fake writable file handle."""

        self.opened_paths.append((path, mode))
        return self.file_handle


class FakeSessionMaker:
    """Async session factory stub for route tests."""

    @asynccontextmanager
    async def __call__(self):
        """Yield a placeholder session object."""

        yield object()

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

    assert response.status_code == 200
    assert response.json()["id"] == 1
    assert response.json()["username"] == "testuser"
    assert response.json()["email"] == "testuser@example.com"
    assert response.json()["is_active"] is True
    assert response.json()["age"] == 30
    assert "created_at" in response.json()


def test_sample_post_endpoint_persists_files_and_returns_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure POST /sample writes the sample file and returns file metadata."""

    filesystem = FakeFilesystemWithOpen()

    async def fake_create_project(*args, **kwargs):
        """Bypass database writes in the route test."""

        return None

    monkeypatch.setattr(sample_api, "fs", filesystem)
    monkeypatch.setattr(sample_api, "create_project", fake_create_project)
    app.dependency_overrides[sample_api.get_session] = lambda: FakeSessionMaker()

    try:
        response = client.post("/sample")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["message"] == "Sample POST endpoint saved data to filesystem and database"
    assert payload["filesystem_path"].startswith("sample-projects/")
    assert payload["filesystem_path"].endswith(".txt")
    assert filesystem.opened_paths == [(payload["filesystem_path"], "wb")]
