import sys
import runpy
import pytest
import sqlite3
from pathlib import Path
from sqlmodel import SQLModel
from contextlib import closing
from longlink.cli.main import main


def test_migrate_command_keeps_an_unchanged_project_at_its_existing_revision(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Apply committed migrations without generating redundant schema revisions."""

    # Arrange
    main(["init", "--folder", str(tmp_path / "sample")])
    monkeypatch.chdir(tmp_path / "sample")
    monkeypatch.setenv("LONGLINK_ENV", "development")
    revisions = set(Path("migrations").glob("*.py"))

    # Act
    main(["migrate"])

    # Assert
    assert set(Path("migrations").glob("*.py")) == revisions
    assert "No migrations were created" in capsys.readouterr().out


def test_migrate_command_generates_and_applies_a_discovered_model(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Discover a nested model, apply its revision, and skip unchanged generations."""

    # Arrange
    monkeypatch.chdir(tmp_path)
    monkeypatch.setenv("LONGLINK_ENV", "development")
    table_name = "cli_migrated_inventory_items"
    module_name = "src.models.catalog.cli_migrated_inventory"
    assert table_name not in SQLModel.metadata.tables
    assert module_name not in sys.modules
    previous_modules = set(sys.modules)
    model_path = tmp_path / "src" / "models" / "catalog" / "cli_migrated_inventory.py"
    model_path.parent.mkdir(parents=True)
    model_path.write_text(
        "from sqlmodel import Field, SQLModel\n"
        "\n\n"
        "class CliMigratedInventoryItem(SQLModel, table=True):\n"
        '    """Inventory table discovered by the migrate command."""\n'
        "\n"
        f'    __tablename__ = "{table_name}"\n'
        "\n"
        "    id: int | None = Field(default=None, primary_key=True)\n",
        encoding="utf-8",
    )

    try:
        # Act
        main(["migrate"])

        # Assert
        [revision_path] = (tmp_path / "migrations").glob("*.py")
        revision = runpy.run_path(str(revision_path))["revision"]
        with closing(sqlite3.connect(tmp_path / "dev.db")) as connection:
            tables = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", (table_name,)).fetchall()
            applied_revisions = connection.execute("SELECT version_num FROM alembic_version").fetchall()
            assert connection.execute("SELECT COUNT(*) FROM users").fetchone() == (0,)
        assert tables == [(table_name,)]
        assert applied_revisions == [(revision,)]

        # Keep the applied revision when the discovered schema is unchanged.
        capsys.readouterr()
        main(["migrate"])
        assert list((tmp_path / "migrations").glob("*.py")) == [revision_path]
        assert "No migrations were created" in capsys.readouterr().out
    finally:
        # Remove test-owned metadata and imported Solution modules even on migration failure.
        table = SQLModel.metadata.tables.get(table_name)
        if table is not None:
            SQLModel.metadata.remove(table)
        for name in set(sys.modules) - previous_modules:
            if name == "src" or name.startswith("src."):
                sys.modules.pop(name, None)
