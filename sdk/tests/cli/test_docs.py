import click
from longlink.cli.docs import (render_component_docs, resolve_component_schema,
                               summarize_component_schema)


def test_resolve_component_schema_matches_component_case_insensitively() -> None:
    """Resolve bundled component schemas by component name."""

    assert resolve_component_schema("button").name == "Button.xsd"
    assert resolve_component_schema("BUTTON").name == "Button.xsd"


def test_render_component_docs_includes_props_and_description() -> None:
    """Render useful docs from a bundled XML component schema."""

    docs = render_component_docs("State")

    assert "<State />" in docs
    assert "Props:" in docs
    assert "- id (required): string" in docs
    assert "- any (optional): any" in docs


def test_summarize_component_schema_rejects_schema_without_root_element(tmp_path) -> None:
    """Reject schemas that cannot describe a component."""

    schema_path = tmp_path / "Empty.xsd"
    schema_path.write_text('<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" />')

    try:
        summarize_component_schema(schema_path, "Empty")
    except click.ClickException as exc:
        assert "does not define a root element" in str(exc)
    else:
        raise AssertionError("Schema without a root element should fail")
