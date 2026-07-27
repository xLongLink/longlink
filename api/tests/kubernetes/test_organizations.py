import pytest
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.organizations import Organizations

pytestmark = pytest.mark.no_db


def test_organization_manifests_include_namespace_and_network_policy() -> None:
    """Render one Organization namespace boundary without a cluster connection."""

    # Create an Organization manifest renderer without a cluster connection.
    renderer = Organizations(KubernetesResources("unused"))

    # Render resources for one Organization namespace.
    manifests = renderer.manifests("acme")

    # Verify the namespace and isolation policy remain metadata-neutral.
    assert manifests.namespace["kind"] == "Namespace"
    assert manifests.namespace["metadata"]["name"] == "acme"
    assert "labels" not in manifests.namespace["metadata"]
    assert "annotations" not in manifests.namespace["metadata"]
    assert manifests.network_policy["kind"] == "NetworkPolicy"
    assert manifests.network_policy["metadata"]["namespace"] == "acme"
    assert "labels" not in manifests.network_policy["metadata"]
    assert "annotations" not in manifests.network_policy["metadata"]
    assert manifests.network_policy["spec"]["podSelector"] == {}
