import pytest
from pathlib import Path
from src.utils import templates
from importlib.resources import files

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


def test_application_template_runs_the_migration_function() -> None:
    """Run the SDK migration application function in the migration Job."""

    # Act
    migration, *_ = templates.readyml_list(
        files("src.kubernetes.templates").joinpath("application", "application.yml"),
        application_id="00000000-0000-4000-8000-000000000001",
        application_id_label="longlink.io/application-id",
        image='"ghcr.io/longlink/sample:latest"',
        namespace="acme",
        runtime_revision="revision",
        migration_id="migration",
    )

    # Assert
    spec = migration["spec"]
    assert isinstance(spec, dict)
    template = spec["template"]
    assert isinstance(template, dict)
    pod_spec = template["spec"]
    assert isinstance(pod_spec, dict)
    containers = pod_spec["containers"]
    assert isinstance(containers, list)
    container = containers[0]
    assert isinstance(container, dict)
    assert container["command"] == [
        "python",
        "-c",
        "from longlink.database.migrations import apply_migrations; apply_migrations()",
    ]


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
