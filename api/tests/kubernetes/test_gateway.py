import yaml
import pytest
from uuid import UUID
from src.kubernetes.gateway import Gateway, GatewayTLSMaterial
from src.kubernetes.reconcile import DesiredApplication

pytestmark = pytest.mark.no_db


def test_gateway_config_routes_applications_with_auth_headers_in_deterministic_order() -> None:
    """Render Envoy routes from desired Applications without cluster discovery."""

    # Arrange
    applications = (
        DesiredApplication(
            id=UUID("20000000-0000-4000-8000-000000000002"),
            organization_id=UUID("10000000-0000-4000-8000-000000000002"),
            namespace="beta",
            image="ghcr.io/longlink/beta@sha256:" + "b" * 64,
            envs={},
        ),
        DesiredApplication(
            id=UUID("20000000-0000-4000-8000-000000000001"),
            organization_id=UUID("10000000-0000-4000-8000-000000000001"),
            namespace="acme",
            image="ghcr.io/longlink/acme@sha256:" + "a" * 64,
            envs={},
        ),
    )

    # Act
    config = yaml.safe_load(Gateway().config(applications))

    # Assert
    routes = config["static_resources"]["listeners"][0]["filter_chains"][0]["filters"][0]["typed_config"]["route_config"]["virtual_hosts"][0]["routes"]
    clusters = config["static_resources"]["clusters"]
    assert routes[0]["match"] == {"path": "/ready"}
    assert routes[-1]["direct_response"]["status"] == 404
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

    # Arrange
    tls = GatewayTLSMaterial(ca_certificate="ca", certificate="certificate", private_key="private-key")

    # Act
    manifests = Gateway().manifests("compute-id", "proxy-secret", tls, "envoy-config", "v1.2.3")

    # Assert
    assert manifests.auth_secret["kind"] == "Secret"
    assert manifests.auth_secret["stringData"] == {"gateway-secret": "proxy-secret"}
    assert manifests.tls_secret["stringData"] == {"ca.crt": "ca", "tls.crt": "certificate", "tls.key": "private-key"}
    assert manifests.config_map["data"] == {"envoy.yaml": "envoy-config"}
    assert manifests.deployment["metadata"]["annotations"]["longlink.io/runtime-revision"] == manifests.runtime_revision
    assert manifests.service["metadata"]["annotations"]["longlink.io/runtime-revision"] == manifests.runtime_revision


def test_gateway_tls_reuses_valid_material_for_same_endpoint() -> None:
    """Reuse persisted gateway TLS material while it still matches the compute and endpoint."""

    # Arrange
    gateway = Gateway()
    material = gateway.tls("compute-id", "gateway.example")

    # Act
    reused = gateway.tls("compute-id", "gateway.example", material)

    # Assert
    assert reused == material


def test_gateway_tls_rotates_when_endpoint_changes() -> None:
    """Generate new gateway TLS material when the endpoint SAN no longer matches."""

    # Arrange
    gateway = Gateway()
    material = gateway.tls("compute-id", "gateway.example")


    # Act
    rotated = gateway.tls("compute-id", "other.example", material)


    # Assert
    assert rotated != material
    assert gateway.tls("compute-id", "other.example", rotated) == rotated


def test_gateway_tls_rotates_malformed_material() -> None:
    """Generate new gateway TLS material when persisted PEM data is malformed."""

    # Arrange
    material = GatewayTLSMaterial(ca_certificate="bad-ca", certificate="bad-cert", private_key="bad-key")

    # Act
    rotated = Gateway().tls("compute-id", "gateway.example", material)

    # Assert
    assert rotated != material
    assert "BEGIN CERTIFICATE" in rotated.ca_certificate
