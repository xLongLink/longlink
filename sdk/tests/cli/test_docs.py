from longlink.cli.docs import render_component_docs


def test_component_docs_resolve_case_insensitively_and_render_props() -> None:
    """Resolve bundled component schemas and render useful component docs."""

    # Render a case-insensitive component lookup through its public output.
    assert render_component_docs("button").startswith("<Button")

    # Render another component's documented properties.
    assert "- id (required): string" in render_component_docs("State")
