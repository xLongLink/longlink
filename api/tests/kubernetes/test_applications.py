import pytest
from uuid import UUID
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.applications import Applications
from src.kubernetes.reconcile import DesiredApplication, DesiredOrganization

pytestmark = pytest.mark.no_db


def test_application_manifests_include_labels_annotations_and_secret_envs() -> None:
    """Render one application's workload resources without a cluster connection."""

    # Arrange
    application = DesiredApplication(
        id=UUID("20000000-0000-4000-8000-000000000001"),
        organization_id=UUID("10000000-0000-4000-8000-000000000001"),
        namespace="acme",
        image="ghcr.io/longlink/dashboard@sha256:" + "a" * 64,
        envs={"PORT": "8000", "API_KEY": "secret"},
    )
    renderer = Applications(KubernetesResources("unused"))

    # Act
    manifests = renderer.manifests(application, "compute-id", "revision-secret", "v1.2.3")

    # Assert
    labels = manifests.secret["metadata"]["labels"]
    annotations = manifests.secret["metadata"]["annotations"]
    assert manifests.secret["kind"] == "Secret"
    assert manifests.secret["metadata"]["name"] == str(application.id)
    assert manifests.secret["stringData"] == {"API_KEY": "secret", "PORT": "8000"}
    assert labels["longlink.io/application-id"] == str(application.id)
    assert labels["longlink.io/organization-id"] == str(application.organization_id)
    assert annotations["longlink.io/platform-version"] == "v1.2.3"
    assert manifests.deployment["kind"] == "Deployment"
    assert manifests.service["kind"] == "Service"


def test_organization_manifests_include_namespace_and_network_policy() -> None:
    """Render one Organization namespace boundary without a cluster connection."""

    # Arrange
    organization = DesiredOrganization(id=UUID("10000000-0000-4000-8000-000000000001"), slug="acme")
    renderer = Applications(KubernetesResources("unused"))

    # Act
    manifests = renderer.organization_manifests(organization, "compute-id", "v1.2.3")

    # Assert
    assert manifests.namespace["kind"] == "Namespace"
    assert manifests.namespace["metadata"]["name"] == "acme"
    assert manifests.namespace["metadata"]["labels"]["longlink.io/organization-id"] == str(organization.id)
    assert manifests.network_policy["kind"] == "NetworkPolicy"
    assert manifests.network_policy["metadata"]["namespace"] == "acme"
