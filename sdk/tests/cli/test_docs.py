import json
import pytest
from pathlib import Path
from longlink.cli import docs
from longlink.cli.main import main


def test_docs_command_lists_documented_component_categories(capsys: pytest.CaptureFixture[str]) -> None:
    """Expose JSX components and scoped runtime capabilities through the public CLI."""

    # Act
    main(["docs"])

    # Assert
    output = capsys.readouterr().out
    assert "LongLink JSX View components" in output
    assert "longlink docs group Runtime" in output
    assert "longlink docs group Action" in output
    assert "longlink docs group Display" in output
    assert "longlink docs group Form" in output
    assert "longlink docs group Layouts" in output
    assert "React state and controlled callbacks" in output
    assert "longlink docs search" in output
    assert "longlink docs build" in output

    # CLI help exposes both workflow guidance and individual API lookup.
    assert "longlink docs component" in output


def test_docs_command_resolves_a_component_name_case_insensitively(capsys: pytest.CaptureFixture[str]) -> None:
    """Show component documentation from a lower-case component name."""

    # Arrange
    main(["docs", "component", "Button"])
    canonical = capsys.readouterr().out

    # Act
    main(["docs", "component", "button"])

    # Assert
    output = capsys.readouterr().out
    assert output == canonical
    assert "Button [Action]" in output
    assert "undefined" not in output
    assert "onClick" in output
    assert "Example" not in output
    assert "Source:" not in output
    assert "https://ui.shadcn.com/" not in output


def test_docs_command_reports_an_unknown_component_without_a_traceback(capsys: pytest.CaptureFixture[str]) -> None:
    """Return the CLI error contract for unknown component names."""

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["docs", "component", "unknown-component"])

    # Assert
    assert failure.value.code == 1
    assert capsys.readouterr().err == (
        'Error: Unknown component: unknown-component. Run `longlink docs search "unknown-component"` to find available APIs.\n'
    )


def test_docs_build_resolves_editing_form_guidance(capsys: pytest.CaptureFixture[str]) -> None:
    """Resolve the form workflow to APIs present in the packaged runtime catalog."""

    # Act
    main(["docs", "build", "editing form"])

    # Assert
    output = capsys.readouterr().out
    assert "Approach: Editing form" in output
    assert "longlink docs component Controller" in output
    assert "longlink docs component Hooks" in output


@pytest.mark.parametrize(
    ("problem", "message"),
    [
        ("group", "references unknown group: missing-group"),
        ("reference", "references unknown component: MissingComponent"),
        ("duplicate", "Component names must be unique case-insensitively"),
    ],
)
def test_docs_rejects_invalid_catalog_references(
    problem: str, message: str, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    """Reject broken packaged relationships through the CLI error boundary."""

    # Arrange
    documentation = docs.catalog().model_dump()
    if problem == "group":
        documentation["components"][0]["category"] = "missing-group"
    elif problem == "reference":
        documentation["patterns"][0]["components"].append("MissingComponent")
    else:
        duplicate = documentation["components"][0].copy()
        duplicate["name"] = duplicate["name"].swapcase()
        documentation["components"].append(duplicate)
    catalog_path = tmp_path / ".static" / "jsx" / "components.json"
    catalog_path.parent.mkdir(parents=True)
    catalog_path.write_text(json.dumps(documentation), encoding="utf-8")
    monkeypatch.setattr(docs, "ROOT", tmp_path)

    # Act
    with pytest.raises(SystemExit) as failure:
        main(["docs"])

    # Assert
    assert failure.value.code == 1
    error = capsys.readouterr().err
    assert "Unable to load documentation catalog" in error
    assert message in error
    assert "Traceback" not in error
