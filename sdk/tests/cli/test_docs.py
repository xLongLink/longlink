from longlink.cli.docs import render_component_docs


def test_component_docs_resolve_case_insensitively_and_render_props() -> None:
    """Resolve bundled component schemas and render useful component docs."""

    # Render a case-insensitive component lookup through its public output.
    button_docs = render_component_docs("button")
    assert button_docs.startswith("<Button")

    # Render another component's documented properties.
    docs = render_component_docs("State")

    assert "- id (required): string" in docs
