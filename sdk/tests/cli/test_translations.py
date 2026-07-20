import json
from pytest import MonkeyPatch
from pathlib import Path
from longlink.cli import translations
from click.testing import CliRunner


def test_generate_updates_current_app_translation_catalog(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Generate current application keys while preserving existing and plural values."""

    # Arrange
    pages_directory = tmp_path / "src" / "pages"
    nested_pages_directory = pages_directory / "admin"
    catalog_path = tmp_path / "src" / "i18n" / "en.json"
    ignored_static_page = tmp_path / ".static" / "new" / "src" / "pages" / "ignored.xml"
    runner = CliRunner()

    pages_directory.mkdir(parents=True)
    nested_pages_directory.mkdir(parents=True)
    catalog_path.parent.mkdir(parents=True)
    ignored_static_page.parent.mkdir(parents=True)
    (pages_directory / "dashboard.xml").write_text('<Text i18n="dashboard.title" />', encoding="utf-8")
    (pages_directory / "tasks.xml").write_text('<Text i18n="tasks.count" />', encoding="utf-8")
    (nested_pages_directory / "users.xml").write_text('<Text i18n="admin.users.title" />', encoding="utf-8")
    catalog_path.write_text(
        json.dumps(
            {
                "dashboard": {"title": "Dashboard"},
                "tasks": {"count": {"one": "One task", "other": "{count} tasks"}},
            }
        ),
        encoding="utf-8",
    )
    ignored_static_page.write_text('<Text i18n="examples.ignored.title" />', encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    # Act
    result = runner.invoke(translations.generate_command)

    # Assert
    assert result.exit_code == 0
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    assert catalog == {
        "admin": {"users": {"title": ""}},
        "dashboard": {"title": "Dashboard"},
        "tasks": {"count": {"one": "One task", "other": "{count} tasks"}},
    }
    assert "Generated src/i18n/en.json from 3 translation keys." in result.output


def test_generate_rejects_translation_key_collisions(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Reject catalogs where a key is both a leaf and a namespace."""

    # Arrange
    pages_directory = tmp_path / "src" / "pages"
    runner = CliRunner()

    pages_directory.mkdir(parents=True)
    (pages_directory / "tasks.xml").write_text(
        '<Text i18n="tasks.title" /><Text i18n="tasks.title.count" />',
        encoding="utf-8",
    )
    monkeypatch.chdir(tmp_path)

    # Act
    result = runner.invoke(translations.generate_command)

    # Assert
    assert result.exit_code == 1
    assert "Translation key collision at title" in result.output
