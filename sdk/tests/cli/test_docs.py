from typer.testing import CliRunner
from longlink.cli.main import main


def test_docs_command_lists_documented_component_categories() -> None:
    """Expose JSX components and scoped runtime capabilities through the public CLI."""

    # Act
    result = CliRunner().invoke(main, ["docs"])

    # Assert
    assert result.exit_code == 0
    assert "LongLink JSX View components" in result.output
    assert all(category in result.output for category in ("Runtime", "Actions", "Content", "Form", "Layouts"))
    assert "React state and controlled callbacks" in result.output
    assert "- React" in result.output
    assert "- useState" not in result.output
    assert "- request" in result.output
    assert "- Button" in result.output


def test_docs_command_resolves_a_component_name_case_insensitively() -> None:
    """Show component documentation from a lower-case component name."""

    # Act
    result = CliRunner().invoke(main, ["docs", "--component", "button"])

    # Assert
    assert result.exit_code == 0
    assert "Button [Actions]" in result.output
    assert "Props and types" in result.output
    assert "clickAction" in result.output
    assert "Example" in result.output


def test_docs_command_reports_an_unknown_component_without_a_traceback() -> None:
    """Return the CLI error contract for unknown component names."""

    # Act
    result = CliRunner().invoke(main, ["docs", "--component", "unknown-component"])

    # Assert
    assert result.exit_code == 1
    assert result.output == "Error: Unknown component: unknown-component. Run `longlink docs` to list available components.\n"
