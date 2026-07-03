from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import init_command


def test_init_adds_application_entrypoint_envs_routes_and_pages() -> None:
    """Generate the app entrypoint, environment examples, router, and XML pages."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        app_root = Path.cwd() / "sample-app"
        page_names = {path.name for path in (app_root / "src" / "pages").glob("*.xml")}
        dynamic_page = app_root / "src" / "pages" / "requests" / "[request].xml"

        assert result.exit_code == 0
        assert (app_root / "main.py").exists()
        assert (app_root / "src" / "envs.py").exists()
        assert (app_root / ".env.sample").exists()
        assert page_names == {"requests.xml"}
        assert dynamic_page.exists()


def test_init_adds_demo_api_routes_and_testing_mode() -> None:
    """Generate request API, migration, and test scaffolding."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        app_root = Path.cwd() / "sample-app"
        migration_files = list((app_root / "migrations").glob("*.py"))

        assert result.exit_code == 0
        assert (app_root / "src" / "database" / "models" / "requests.py").exists()
        assert (app_root / "src" / "database" / "services" / "requests.py").exists()
        assert (app_root / "src" / "routes" / "requests.py").exists()
        assert (app_root / "src" / "schemas" / "requests.py").exists()
        assert (app_root / "tests" / "conftest.py").exists()
        assert (app_root / "tests" / "test_app.py").exists()
        assert len(migration_files) == 1
