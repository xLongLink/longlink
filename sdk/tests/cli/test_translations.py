import json
from pytest import MonkeyPatch
from pathlib import Path
from longlink.cli import translations
from click.testing import CliRunner


def test_generate_includes_scaffold_page_translation_keys(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Generate scaffold catalog keys from scaffold XML pages."""

    # Arrange
    sdk_root = tmp_path / "sdk" / "longlink"
    scaffold_pages_directory = sdk_root / ".static" / "new" / "src" / "pages"
    catalog_path = sdk_root / ".static" / "new" / "src" / "i18n" / "en.json"
    ignored_static_page = sdk_root / ".static" / "web" / "ignored.xml"
    runner = CliRunner()

    scaffold_pages_directory.mkdir(parents=True)
    ignored_static_page.parent.mkdir(parents=True)
    scaffold_page = scaffold_pages_directory / "dashboard.xml"
    scaffold_page.write_text('<P i18n="examples.scaffold.title" />', encoding="utf-8")
    ignored_static_page.write_text('<P i18n="examples.ignored.title" />', encoding="utf-8")
    monkeypatch.setattr(translations, "ROOT", sdk_root)
    monkeypatch.setattr(translations, "TRANSLATION_FILE", catalog_path)
    monkeypatch.setattr(translations, "SCAFFOLD_PAGES_DIRECTORY", scaffold_pages_directory)

    # Act
    result = runner.invoke(translations.generate_command)

    # Assert
    assert result.exit_code == 0
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    assert catalog == {"examples": {"scaffold": {"title": ""}}}
