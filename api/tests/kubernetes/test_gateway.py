import yaml
import pytest
from uuid import UUID
from src.kubernetes.gateway import Gateway, GatewayRoute, GatewayTLSMaterial
from src.kubernetes.resources import KubernetesResources

pytestmark = pytest.mark.no_db


def test_gateway_config_routes_applications_with_auth_headers_in_deterministic_order() -> None:
    """Render Envoy routes from desired Applications without cluster discovery."""

    # Define unsorted routes for two Applications.
    routes = (
        GatewayRoute(
            id=UUID("20000000-0000-4000-8000-000000000002"),
            namespace="beta",
        ),
        GatewayRoute(
            id=UUID("20000000-0000-4000-8000-000000000001"),
            namespace="acme",
        ),
    )

    # Render and parse the Envoy gateway configuration.
    config = yaml.safe_load(Gateway(KubernetesResources("unused")).config(routes))

    # Verify authenticated routes and clusters have deterministic ordering.
    routes = config["static_resources"]["listeners"][0]["filter_chains"][0]["filters"][0]["typed_config"]["route_config"]["virtual_hosts"][
        0
    ]["routes"]
    clusters = config["static_resources"]["clusters"]
    assert routes[0]["match"] == {"path": "/ready"}
    assert routes[0]["direct_response"] == {"status": 200}
    assert len(routes) == 3
    assert routes[1]["route"]["cluster"] == "acme-20000000-0000-4000-8000-000000000001"
    assert routes[2]["route"]["cluster"] == "beta-20000000-0000-4000-8000-000000000002"
    assert routes[1]["match"]["headers"][0]["name"] == "x-longlink-gateway-secret"
    assert routes[1]["match"]["headers"][1]["name"] == "x-longlink-application-id"
    assert [cluster["name"] for cluster in clusters] == [
        "acme-20000000-0000-4000-8000-000000000001",
        "beta-20000000-0000-4000-8000-000000000002",
    ]


def test_gateway_manifests_include_exact_auth_tls_and_config_resources() -> None:
    """Render gateway resources with exact Secrets and rollout annotations."""

    # Define gateway TLS and authentication inputs.
    gateway = Gateway(KubernetesResources("unused"))
    tls = GatewayTLSMaterial(ca_certificate="ca", certificate="certificate", private_key="private-key")

    # Render the gateway Service and supporting resources.
    service = gateway.service()
    manifests = gateway.manifests("proxy-secret", tls, "envoy-config")

    # Verify gateway metadata, exact Secrets, and rollout configuration.
    assert service["kind"] == "Service"
    assert service["metadata"]["labels"] == {"app": "longlink-gateway"}
    assert "annotations" not in service["metadata"]
    assert manifests.auth_secret["kind"] == "Secret"
    assert "labels" not in manifests.auth_secret["metadata"]
    assert manifests.auth_secret["stringData"] == {"gateway-secret": "proxy-secret"}
    assert "labels" not in manifests.tls_secret["metadata"]
    assert manifests.tls_secret["stringData"] == {"tls.crt": "certificate", "tls.key": "private-key"}
    assert "labels" not in manifests.config_map["metadata"]
    assert manifests.config_map["data"] == {"envoy.yaml": "envoy-config"}
    assert manifests.deployment["metadata"]["labels"] == {"app": "longlink-gateway"}
    runtime_revision = manifests.deployment["metadata"]["annotations"]["longlink.io/runtime-revision"]
    assert runtime_revision
    assert manifests.deployment["spec"]["template"]["metadata"]["annotations"]["longlink.io/runtime-revision"] == runtime_revision
    container = manifests.deployment["spec"]["template"]["spec"]["containers"][0]
    assert container["startupProbe"] == {
        "httpGet": {"path": "/ready", "port": "gateway", "scheme": "HTTPS"},
        "periodSeconds": 2,
        "failureThreshold": 60,
    }


def test_gateway_tls_generates_compute_identity() -> None:
    """Generate gateway TLS material for a newly provisioned compute."""

    # Generate the immutable TLS identity for one compute endpoint.
    material = Gateway(KubernetesResources("unused")).tls("compute-id", "gateway.example")

    # Verify all generated values use PEM encoding.
    assert "BEGIN CERTIFICATE" in material.ca_certificate
    assert "BEGIN CERTIFICATE" in material.certificate
    assert "BEGIN PRIVATE KEY" in material.private_key
