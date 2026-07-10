from fastapi.testclient import TestClient as FastAPITestClient


class TestClient(FastAPITestClient):
    """LongLink test client facade over FastAPI's test client."""
