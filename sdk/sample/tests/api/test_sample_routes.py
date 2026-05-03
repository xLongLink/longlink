from fastapi import FastAPI
from fastapi.testclient import TestClient
from sample.src.api.sample import router as sample_router


class FakeFilesystem:
    """Minimal filesystem stub for sample route assertions."""

    protocol = 'file'


class FakeContext:
    """Minimal request context stub used by the sample router."""

    def __init__(self) -> None:
        self._filesystem = FakeFilesystem()
        self.session = object()
        self.engine = object()

    def fs(self):
        """Return a stable filesystem stub."""

        return self._filesystem

app = FastAPI()
app.include_router(sample_router)
app.state.context = FakeContext()

client = TestClient(app)


def test_sample_get_endpoint_returns_expected_message() -> None:
    """Ensure GET /sample returns the sample response payload."""
    response = client.get("/sample")

    assert response.status_code == 200
    assert response.json()["message"] == "Sample GET endpoint received data"


def test_sample_user_endpoint_returns_typed_payload() -> None:
    """Ensure POST /sample/user returns UserModel payload structure."""
    response = client.post("/sample/user")

    assert response.status_code == 200
    # Validate key fields exposed by endpoint contract.
    assert response.json()["username"] == "testuser"
    assert response.json()["email"] == "testuser@example.com"
