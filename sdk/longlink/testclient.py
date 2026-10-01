"""Test Solution routes with isolated in-memory services."""

from typing import Any
from longlink.app import LongLink, RuntimeState
from fastapi.testclient import TestClient as FastAPITestClient
from longlink.storage.base import create_fs
from longlink.database.base import Database
from longlink.utils.settings import Envs


class TestClient(FastAPITestClient):
    """Use the testing environment for an existing LongLink application."""

    def __init__(self, app: LongLink, **kwargs: Any) -> None:  # noqa: ANN401
        """Install in-memory services before the client handles requests."""

        # Configure only this app; importing the client must not change process state.
        settings = Envs(ENV="testing", STORAGE_BUCKET=None, STORAGE_PREFIX=None)
        storage = create_fs(settings)
        database = Database(settings)
        app.state.longlink = RuntimeState(storage=storage, database=database)

        # Initialize the client after the application owns its isolated services.
        super().__init__(app, **kwargs)
