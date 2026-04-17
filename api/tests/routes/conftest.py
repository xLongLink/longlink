import pytest
from main import app
from collections.abc import Generator
from fastapi.testclient import TestClient


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide FastAPI test client with clean dependency overrides per test."""
    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
