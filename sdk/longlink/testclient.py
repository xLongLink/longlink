"""Test Solution routes with isolated in-memory services."""

import os
from fastapi.testclient import TestClient

__all__ = ["TestClient"]

# Select the testing environment unless the caller configured one explicitly.
os.environ.setdefault("LONGLINK_ENV", "testing")
