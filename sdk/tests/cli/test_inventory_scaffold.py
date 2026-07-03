from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import init_command


def test_init_adds_inventory_create_request_model() -> None:
    """Generate inventory routes that accept the XML action JSON object."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        route_text = (Path.cwd() / "sample-app" / "src" / "routes" / "inventory.py").read_text(
            encoding="utf-8",
        )
        schema_text = (Path.cwd() / "sample-app" / "src" / "schemas" / "inventory.py").read_text(
            encoding="utf-8",
        )

        assert result.exit_code == 0
        assert "payload: InventoryItemCreate" in route_text
        assert "payload.sku" in route_text
        assert "class InventoryItemCreate" in schema_text
        assert "sku: str = Field(min_length=1, max_length=64)" in schema_text


def test_init_adds_safe_file_download_header() -> None:
    """Generate file routes that encode download filenames safely."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        route_text = (Path.cwd() / "sample-app" / "src" / "routes" / "files.py").read_text(
            encoding="utf-8",
        )

        assert result.exit_code == 0
        assert "import urllib.parse" in route_text
        assert "urllib.parse.quote" in route_text
        assert "filename*=UTF-8''{download_name}" in route_text
