"""Test Solution routes with isolated in-memory services."""

from typing import Any
from longlink.app import LongLink
from fastapi.testclient import TestClient as FastAPITestClient


class TestClient(FastAPITestClient):
    """Use the testing environment for an existing LongLink application."""

    def __init__(self, app: LongLink, **kwargs: Any) -> None:  # noqa: ANN401
        """Install in-memory services before the client handles requests."""

        # Configure only this app; importing the client must not change process state.
        app.use_testing_environment()
        super().__init__(app, **kwargs)
