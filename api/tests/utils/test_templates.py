from src.utils import templates


def test_readyml_renders_single_yaml_document(tmp_path) -> None:
    """Render a single YAML template document as a dictionary."""

    template_path = tmp_path / "deployment.yml"
    template_path.write_text("kind: Deployment\nmetadata:\n  name: $name\n", encoding="utf-8")

    assert templates.readyml(template_path, name="dashboard") == {
        "kind": "Deployment",
        "metadata": {"name": "dashboard"},
    }


def test_readyml_renders_multiple_yaml_documents(tmp_path) -> None:
    """Render a multi-document YAML template as a list of dictionaries."""

    template_path = tmp_path / "resources.yml"
    template_path.write_text(
        "kind: Deployment\nmetadata:\n  name: $name\n---\nkind: Service\nmetadata:\n  name: $name\n",
        encoding="utf-8",
    )

    assert templates.readyml(template_path, name="dashboard") == [
        {"kind": "Deployment", "metadata": {"name": "dashboard"}},
        {"kind": "Service", "metadata": {"name": "dashboard"}},
    ]
