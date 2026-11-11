import pytest
from pathlib import Path
from longlink import Context
from sqlalchemy import event
from longlink.app import LongLink
from sqlalchemy.engine import Engine
from longlink.testclient import TestClient as SolutionTestClient
from longlink.storage.filesystem import Filesystem
from fsspec.implementations.local import LocalFileSystem


@pytest.mark.usefixtures("solution_source")
def test_solution_test_client_replaces_development_services_with_testing_services(monkeypatch: pytest.MonkeyPatch) -> None:
    """Select in-memory services and the testing user for an existing development app."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "development")
    app = LongLink()
    assert isinstance(app.state.longlink.storage, Filesystem)
    assert isinstance(app.state.longlink.storage.filesystem.fs, LocalFileSystem)
    assert Path(app.state.longlink.storage.filesystem.path) == Path.cwd() / ".storage"
    disposed: list[Engine] = []

    @app.get("/api/me", response_model=str)
    async def testing_user(value: Context) -> str:
        """Return the user selected by the testing client."""

        # Observe disposal of the replacement services rather than the original development database.
        event.listen(value.database.get_bind(), "engine_disposed", disposed.append)
        return value.user.name

    # Act
    client = SolutionTestClient(app)
    with client:
        user_response = client.get("/api/me")
        assert client.portal is not None
        client.portal.call(app.state.longlink.storage.write, "report.txt", b"report")
        assert client.portal.call(app.state.longlink.storage.exists, "report.txt")

    # Assert
    assert user_response.status_code == 200
    assert user_response.json() == "Testing user"
    assert len(disposed) == 1
    assert not Path("dev.db").exists()

    # Testing writes must not create files on the development filesystem.
    assert not Path("report.txt").exists()
    assert not Path(".storage/report.txt").exists()
