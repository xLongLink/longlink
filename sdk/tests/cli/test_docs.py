import pytest
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

    # Act
    main(["docs", "component", "button"])

    # Assert
    output = capsys.readouterr().out
    assert "Button [Action]" in output
    assert "- label (string):\n  Visible button text and accessible label." in output
    assert '- variant ("ghost" | "primary" | "secondary" | "destructive"):\n  Visual style variant.' in output
    assert "undefined" not in output
    assert "onClick" in output
    assert "Example" not in output


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


def test_docs_exposes_plot_fields_and_dashboard_guidance(capsys: pytest.CaptureFixture[str]) -> None:
    """Make the installed plotting API discoverable without package imports or custom styling."""

    # Act
    main(["docs", "component", "plot"])

    # Assert
    output = capsys.readouterr().out
    assert "Plot [Display]" in output
    assert '"line" | "bar" | "area" | "scatter"' in output
    assert "xKey" in output
    assert "series" in output
    assert "Missing values produce gaps, never zero" in output
    assert "Geographic maps" in output

    # Act
    main(["docs", "build", "dashboard plots"])

    # Assert
    outline = capsys.readouterr().out
    assert "Dashboard plots" in outline
    assert "longlink docs component Plot" in outline
    assert "gap={2}" in outline
    assert "padding={5}" in outline
