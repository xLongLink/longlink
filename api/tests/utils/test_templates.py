import pytest
from pathlib import Path
from src.utils import templates

pytestmark = pytest.mark.no_db

INVALID_RENDERED_DOCUMENTS = [
    pytest.param("---\n---\n", "Rendered YAML template did not contain any documents", id="empty-documents"),
    pytest.param("- application\n", "Rendered YAML templates must contain mapping documents", id="list-document"),
    pytest.param("1: application\n", "Rendered YAML templates must contain mapping documents", id="non-string-keys"),
]


@pytest.mark.parametrize(("content", "message"), INVALID_RENDERED_DOCUMENTS)
def test_readyml_list_rejects_invalid_rendered_documents(tmp_path: Path, content: str, message: str) -> None:
    """Reject rendered YAML that cannot represent Kubernetes manifests."""

    # Arrange
    template_path = tmp_path / "application.yml"
    template_path.write_text(content, encoding="utf-8")

    # Act
    with pytest.raises(ValueError) as error:
        templates.readyml_list(template_path)

    # Assert
    assert str(error.value) == message


def test_readyml_list_renders_mapping_documents(tmp_path: Path) -> None:
    """Render each non-empty YAML mapping with its supplied template values."""

    # Arrange
    template_path = tmp_path / "application.yml"
    template_path.write_text(
        "name: $name\n---\nkind: ConfigMap\nmetadata:\n  name: $name-config\n---\n",
        encoding="utf-8",
    )

    # Assert
    assert templates.readyml_list(template_path, name="dashboard") == [
        {"name": "dashboard"},
        {"kind": "ConfigMap", "metadata": {"name": "dashboard-config"}},
    ]
