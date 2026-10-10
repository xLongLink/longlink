"""Test Solution routes with isolated in-memory services."""

from typing import Any
from longlink.app import LongLink, RuntimeState
from fastapi.testclient import TestClient as FastAPITestClient
from longlink.utils.settings import Envs


class TestClient(FastAPITestClient):
    """Use the testing environment for an existing LongLink application."""

    def __init__(self, app: LongLink, **kwargs: Any) -> None:  # noqa: ANN401
        """Install in-memory services before the client handles requests."""

        # Configure only this app; importing the client must not change process state.
        settings = Envs(ENV="testing", STORAGE_BUCKET=None, STORAGE_PREFIX=None)
        app.state.longlink = RuntimeState.from_settings(settings)

        # Initialize the client after the application owns its isolated services.
        super().__init__(app, **kwargs)
