import pytest
from uuid import UUID
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.organizations import Organizations, DesiredOrganization

pytestmark = pytest.mark.no_db


def test_organization_manifests_include_namespace_and_network_policy() -> None:
    """Render one Organization namespace boundary without a cluster connection."""

    # Arrange
    organization = DesiredOrganization(id=UUID("10000000-0000-4000-8000-000000000001"), slug="acme")
    renderer = Organizations(KubernetesResources("unused"))

    # Act
    manifests = renderer.manifests(organization, "compute-id")

    # Assert
    assert manifests.namespace["kind"] == "Namespace"
    assert manifests.namespace["metadata"]["name"] == "acme"
    assert manifests.namespace["metadata"]["labels"]["longlink.io/organization-id"] == str(organization.id)
    assert manifests.namespace["metadata"]["labels"]["longlink.io/resource-scope"] == "application"
    assert "longlink.io/platform-version" not in manifests.namespace["metadata"]["annotations"]
    assert manifests.network_policy["kind"] == "NetworkPolicy"
    assert manifests.network_policy["metadata"]["namespace"] == "acme"
    assert "longlink.io/platform-version" not in manifests.network_policy["metadata"]["annotations"]
