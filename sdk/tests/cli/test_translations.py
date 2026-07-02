import json
from pytest import MonkeyPatch
from pathlib import Path
from longlink.cli import translations
from click.testing import CliRunner


def test_generate_updates_current_app_translation_catalog(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Generate current application catalog keys from current application XML pages."""

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
    (pages_directory / "dashboard.xml").write_text('<P i18n="dashboard.title" />', encoding="utf-8")
    (nested_pages_directory / "users.xml").write_text('<P i18n="admin.users.title" />', encoding="utf-8")
    catalog_path.write_text(json.dumps({"dashboard": {"title": "Dashboard"}}), encoding="utf-8")
    ignored_static_page.write_text('<P i18n="examples.ignored.title" />', encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    # Act
    result = runner.invoke(translations.generate_command)

    # Assert
    assert result.exit_code == 0
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    assert catalog == {
        "admin": {"users": {"title": ""}},
        "dashboard": {"title": "Dashboard"},
    }
    assert "Generated src/i18n/en.json from 2 translation keys." in result.output
