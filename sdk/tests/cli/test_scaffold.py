from pathlib import Path
from click.testing import CliRunner
from longlink.cli.init import init_command
from longlink.utils.xml import Longlink


def test_init_adds_application_entrypoint_envs_routes_and_pages() -> None:
    """Generate the app entrypoint, environment examples, routers, and XML showcase pages."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        app_root = Path.cwd() / "sample-app"
        main_text = (app_root / "main.py").read_text(encoding="utf-8")
        env_text = (app_root / "src" / "envs.py").read_text(encoding="utf-8")
        env_sample_text = (app_root / ".env.sample").read_text(encoding="utf-8")
        page_names = {path.name for path in (app_root / "src" / "pages").glob("*.xml")}

        assert result.exit_code == 0
        assert "app = LongLink(env=env)" in main_text
        assert "app.include_router(files.router)" in main_text
        assert "app.include_router(inventory.router)" in main_text
        assert "app.include_router(submissions.router)" in main_text
        assert "REQUIRED: str = Field(" in env_text
        assert "OPTIONAL: str = Field(" in env_text
        assert "REQUIRED=required" in env_sample_text
        assert "OPTIONAL=optional" in env_sample_text
        assert page_names == {
            "cart.xml",
            "documents.xml",
            "form.xml",
            "inventory.xml",
            "menu.xml",
            "quote.xml",
            "text.xml",
        }

        for page_path in (app_root / "src" / "pages").glob("*.xml"):
            Longlink(page_path).validate()


def test_init_adds_demo_api_routes_and_testing_mode() -> None:
    """Generate demo inventory, file, submission, migration, and test scaffolding."""

    # Arrange
    runner = CliRunner()

    with runner.isolated_filesystem():
        # Act
        result = runner.invoke(init_command, ["--folder", "sample-app"])

        # Assert
        app_root = Path.cwd() / "sample-app"
        inventory_model_text = (app_root / "src" / "database" / "models" / "inventory.py").read_text(encoding="utf-8")
        inventory_route_text = (app_root / "src" / "routes" / "inventory.py").read_text(encoding="utf-8")
        file_route_text = (app_root / "src" / "routes" / "files.py").read_text(encoding="utf-8")
        submission_route_text = (app_root / "src" / "routes" / "submissions.py").read_text(encoding="utf-8")
        test_config_text = (app_root / "tests" / "conftest.py").read_text(encoding="utf-8")
        smoke_test_text = (app_root / "tests" / "test_app.py").read_text(encoding="utf-8")
        migration_text = next((app_root / "migrations").glob("*.py")).read_text(encoding="utf-8")

        assert result.exit_code == 0
        assert "class InventoryItem(db.Table, table=True)" in inventory_model_text
        assert '@router.get("/inventory"' in inventory_route_text
        assert '@router.post("/inventory"' in inventory_route_text
        assert '@router.get("/files"' in file_route_text
        assert '@router.post("/files"' in file_route_text
        assert '@router.get("/files/{file_id}"' in file_route_text
        assert '@router.delete("/files/{file_id}"' in file_route_text
        assert "fs.open(storage_path" in file_route_text
        assert '@router.post("/form")' in submission_route_text
        assert '@router.post("/order")' in submission_route_text
        assert "payload or {}" in submission_route_text
        assert 'os.environ["LONGLINK_ENV"] = "testing"' in test_config_text
        assert 'os.environ["LONGLINK_DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"' in test_config_text
        assert "test_form_endpoint_returns_submitted_payload" in smoke_test_text
        assert "inventory_items" in migration_text
