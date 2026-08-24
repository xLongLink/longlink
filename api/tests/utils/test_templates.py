import pytest
from pathlib import Path
from src.utils import templates

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("content", "message"),
    [
        pytest.param("---\n---\n", "Rendered YAML template did not contain any documents", id="empty-documents"),
        pytest.param("- application\n", "Rendered YAML templates must contain mapping documents", id="list-document"),
    ],
)
def test_readyml_list_rejects_invalid_rendered_documents(tmp_path: Path, content: str, message: str) -> None:
    """Reject rendered YAML that cannot represent Kubernetes manifests."""

    # Arrange
    template_path = tmp_path / "application.yml"
    template_path.write_text(content, encoding="utf-8")

    # Act and assert
    with pytest.raises(ValueError, match=message):
        templates.readyml_list(template_path)


def test_readyml_list_renders_mapping_documents(tmp_path: Path) -> None:
    """Render each non-empty YAML mapping with its supplied template values."""

    # Arrange
    template_path = tmp_path / "application.yml"
    template_path.write_text(
        "name: $name\n---\nkind: ConfigMap\nmetadata:\n  name: $name-config\n---\n",
        encoding="utf-8",
    )

    # Act
    documents = templates.readyml_list(template_path, name="dashboard")

    # Assert
    assert documents == [
        {"name": "dashboard"},
        {"kind": "ConfigMap", "metadata": {"name": "dashboard-config"}},
    ]


def test_readyml_list_rejects_mapping_with_non_string_keys(tmp_path: Path) -> None:
    """Reject YAML mappings that cannot be Kubernetes manifest objects."""

    # Arrange
    template_path = tmp_path / "application.yml"
    template_path.write_text("1: application\n", encoding="utf-8")

    # Act and assert
    with pytest.raises(ValueError, match="Rendered YAML templates must contain mapping documents"):
        templates.readyml_list(template_path)
