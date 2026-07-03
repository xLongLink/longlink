from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import init_command


def test_init_adds_purchase_request_models_and_routes() -> None:
    """Generate purchase request routes that accept XML action JSON objects."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        app_root = Path.cwd() / "sample-app"

        assert result.exit_code == 0
        assert (app_root / "src" / "database" / "models" / "requests.py").exists()
        assert (app_root / "src" / "database" / "services" / "requests.py").exists()
        assert (app_root / "src" / "routes" / "requests.py").exists()
        assert (app_root / "src" / "schemas" / "requests.py").exists()


def test_init_adds_request_attachment_routes() -> None:
    """Generate attachment routes that encode download filenames safely."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        app_root = Path.cwd() / "sample-app"
        route_source = (app_root / "src" / "routes" / "requests.py").read_text(encoding="utf-8")

        assert result.exit_code == 0
        assert "UploadFile" in route_source
        assert "urllib.parse.quote" in route_source
        assert "content-disposition" in route_source
