import sys
import pytest
from types import SimpleNamespace
from pathlib import Path
from alembic.config import Config
from collections.abc import Callable, Generator
from longlink.database import migrations as database_migrations
from alembic.operations.ops import UpgradeOps, DowngradeOps, CreateTableOp, MigrationScript
from longlink.database.base import database_metadata


@pytest.fixture
def isolated_model(tmp_path, monkeypatch) -> Generator[tuple[Path, Callable[[str, str], None]], None, None]:
    """Provide an isolated application model file and clean up its global import state."""

    # Create the model path in a temporary application project.
    root = tmp_path / "src" / "database" / "models" / "catalog"
    model_path = root / "inventory.py"
    root.mkdir(parents=True)
    monkeypatch.chdir(tmp_path)
    tracked_table_name: str | None = None

    def write(table_name: str, source: str) -> None:
        """Write a model source file and track its metadata table for cleanup."""

        nonlocal tracked_table_name
        tracked_table_name = table_name
        model_path.write_text(source, encoding="utf-8")

    yield model_path, write

    # Remove temporary metadata and module state even if model discovery fails.
    if tracked_table_name is not None:
        table = database_metadata.tables.get(tracked_table_name)
        if table is not None:
            database_metadata.remove(table)
    sys.modules.pop("src.database.models.catalog.inventory", None)


def test_migration_loader_discovers_nested_database_models(
    isolated_model: tuple[Path, Callable[[str, str], None]],
) -> None:
    """Load nested application model modules for Alembic metadata."""

    # Create a nested Application model in an isolated project tree.
    table_name = "nested_inventory_items"
    _, write_model = isolated_model
    write_model(
        table_name,
        "from sqlmodel import Field, SQLModel\n"
        "\n\n"
        "class NestedInventoryItem(SQLModel, table=True):\n"
        '    """Nested inventory table."""\n'
        "\n"
        f'    __tablename__ = "{table_name}"\n'
        "\n"
        "    id: int | None = Field(default=None, primary_key=True)\n",
    )

    # Load project models and verify their metadata registration.
    database_migrations.load_application_models()

    assert table_name in database_metadata.tables


def test_migration_loader_removes_failed_model_import_before_retry(
    isolated_model: tuple[Path, Callable[[str, str], None]],
) -> None:
    """Allow a corrected model module to load after its first import fails."""

    # Arrange
    table_name = "retry_inventory_items"
    module_name = "src.database.models.catalog.inventory"
    model_path, write_model = isolated_model
    write_model(table_name, 'raise RuntimeError("broken model")\n')

    # Act
    with pytest.raises(RuntimeError, match="broken model"):
        database_migrations.load_application_models()

    # Assert
    assert module_name not in sys.modules

    # Act
    write_model(
        table_name,
        "from sqlmodel import Field, SQLModel\n"
        "\n\n"
        "class RetryInventoryItem(SQLModel, table=True):\n"
        '    """Retry inventory table."""\n'
        "\n"
        f'    __tablename__ = "{table_name}"\n'
        "\n"
        "    id: int | None = Field(default=None, primary_key=True)\n",
    )
    database_migrations.load_application_models()

    # Assert
    assert table_name in database_metadata.tables


@pytest.mark.parametrize(
    ("name", "type_", "expected"),
    [
        pytest.param("audit", "table", False, id="shared-audit-table"),
        pytest.param("inventory", "table", True, id="application-table"),
        pytest.param("audit", "index", True, id="audit-index"),
    ],
)
def test_include_object_excludes_only_platform_owned_audit_table(name: str, type_: str, expected: bool) -> None:
    """Keep Platform-owned audit tables out of Application Alembic revisions."""

    # Act
    included = database_migrations.include_object(object(), name, type_, False, None)

    # Assert
    assert included is expected


@pytest.mark.parametrize(
    ("directives", "expected_migration_created"),
    [
        pytest.param([MigrationScript(None, UpgradeOps(), DowngradeOps())], False, id="empty-revision"),
        pytest.param([], False, id="no-directives"),
        pytest.param([MigrationScript(None, UpgradeOps(ops=[CreateTableOp("inventory", [])]), DowngradeOps())], True, id="table-created"),
    ],
)
def test_make_migrations_creates_revisions_only_for_schema_operations(
    tmp_path,
    monkeypatch,
    directives: list[MigrationScript],
    expected_migration_created: bool,
) -> None:
    """Create revisions only when autogeneration finds schema operations."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(database_migrations, "load_application_models", lambda: None)
    original_directives = list(directives)

    def fake_revision(
        _cfg: object,
        autogenerate: bool,
        process_revision_directives: Callable[[object, object, list[MigrationScript]], None],
    ) -> None:
        """Run Alembic's callback with the supplied directives."""

        assert autogenerate is True
        process_revision_directives(object(), object(), directives)

    monkeypatch.setattr(database_migrations.command, "revision", fake_revision)

    # Act
    migration_created = database_migrations.make_migrations()

    # Assert
    assert migration_created is expected_migration_created
    assert directives == (original_directives if expected_migration_created else [])


def test_production_migrations_reject_missing_revisions_before_upgrade(tmp_path, monkeypatch) -> None:
    """Fail production startup before Alembic upgrades without application revisions."""

    # Emulate a production runtime without a committed migrations directory.
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(database_migrations, "Envs", lambda: SimpleNamespace(ENV="production"))

    monkeypatch.setattr(
        database_migrations.command,
        "upgrade",
        lambda *_: pytest.fail("Alembic upgrade must not run without application migrations"),
    )

    # Reject missing revisions without handing control to Alembic.
    with pytest.raises(RuntimeError, match="require migrations"):
        database_migrations.apply_migrations()


def test_production_migrations_rejects_only_init_file_before_upgrade(tmp_path, monkeypatch) -> None:
    """Fail production startup when the migrations directory has no revision files."""

    # Arrange
    migrations_path = tmp_path / "migrations"
    migrations_path.mkdir()
    migrations_path.joinpath("__init__.py").write_text("", encoding="utf-8")
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(database_migrations, "Envs", lambda: SimpleNamespace(ENV="production"))
    monkeypatch.setattr(
        database_migrations.command,
        "upgrade",
        lambda *_: pytest.fail("Alembic upgrade must not run without application migrations"),
    )

    # Act and assert
    with pytest.raises(RuntimeError, match="require migrations"):
        database_migrations.apply_migrations()


@pytest.mark.parametrize(("environment", "committed_revision"), [("production", True), ("development", False)])
def test_migrations_upgrade_head_when_revisions_are_available_or_development(tmp_path, monkeypatch, environment: str, committed_revision: bool) -> None:
    """Apply revisions in production with a committed file and initialize development storage."""

    # Arrange
    migrations_path = tmp_path / "migrations"
    if committed_revision:
        migrations_path.mkdir()
        migrations_path.joinpath("001_initial.py").write_text("", encoding="utf-8")
    captured: dict[str, Config | str] = {}
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(database_migrations, "Envs", lambda: SimpleNamespace(ENV=environment))

    def upgrade(config: Config, target: str) -> None:
        """Capture the Alembic configuration and revision target."""

        captured["config"] = config
        captured["target"] = target

    monkeypatch.setattr(database_migrations.command, "upgrade", upgrade)

    # Act
    database_migrations.apply_migrations()

    # Assert
    config = captured["config"]
    assert isinstance(config, Config)
    assert migrations_path.is_dir()
    assert captured["target"] == "head"
    assert config.get_main_option("script_location") == str(database_migrations.CURRENT_FILE.parent)
    assert config.get_main_option("version_locations") == str(migrations_path)
