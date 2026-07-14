from longlink.cli.docs import render_component_docs, resolve_component_schema


def test_component_docs_resolve_case_insensitively_and_render_props() -> None:
    """Resolve bundled component schemas and render useful component docs."""

    assert resolve_component_schema("button").name == "Button.xsd"

    docs = render_component_docs("State")

    assert "- id (required): string" in docs
