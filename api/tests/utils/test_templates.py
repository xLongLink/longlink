import pytest
from src.utils import templates


@pytest.mark.parametrize(
    ("content", "expected"),
    [
        (
            "kind: Deployment\nmetadata:\n  name: $name\n",
            {"kind": "Deployment", "metadata": {"name": "dashboard"}},
        ),
        (
            "kind: Deployment\nmetadata:\n  name: $name\n---\nkind: Service\nmetadata:\n  name: $name\n",
            [
                {"kind": "Deployment", "metadata": {"name": "dashboard"}},
                {"kind": "Service", "metadata": {"name": "dashboard"}},
            ],
        ),
    ],
)
def test_readyml_renders_yaml_templates(tmp_path, content: str, expected: object) -> None:
    """Render single and multi-document YAML templates."""

    template_path = tmp_path / "resources.yml"
    template_path.write_text(content, encoding="utf-8")

    assert templates.readyml(template_path, name="dashboard") == expected
