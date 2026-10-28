import pytest
from pathlib import Path
from longlink import Context
from sqlalchemy import event
from longlink.app import LongLink
from sqlalchemy.engine import Engine
from longlink.testclient import TestClient as SolutionTestClient
from fsspec.implementations.dirfs import DirFileSystem


@pytest.mark.usefixtures("solution_source")
def test_solution_test_client_replaces_development_services_with_testing_services(monkeypatch: pytest.MonkeyPatch) -> None:
    """Select in-memory services and the testing user for an existing development app."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "development")
    app = LongLink()
    assert isinstance(app.state.longlink.storage, DirFileSystem)
    assert "file" in app.state.longlink.storage.fs.protocol
    assert Path(app.state.longlink.storage.path) == Path.cwd() / ".storage"
    assert Path(".storage").is_dir()
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

    # Assert
    assert user_response.status_code == 200
    assert user_response.json() == "Testing user"
    assert len(disposed) == 1
    assert not Path("dev.db").exists()

    # Exercise relative in-memory file operations without creating a local report.
    storage = app.state.longlink.storage
    assert storage.ls("", detail=False) == []
    storage.pipe_file("report.txt", b"report")
    assert not Path("report.txt").exists()
