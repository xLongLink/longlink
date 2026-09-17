"""Test Solution routes with isolated in-memory services."""

import os
from fastapi.testclient import TestClient as FastAPITestClient

# Select the testing environment unless the caller configured one explicitly.
os.environ.setdefault("LONGLINK_ENV", "testing")


class TestClient(FastAPITestClient):
    """Serve one Solution app in tests with isolated in-memory services."""
