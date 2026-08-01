import yaml
import pytest
import ipaddress
from uuid import UUID
from datetime import timedelta
from cryptography import x509
from src.kubernetes.gateway import GatewayRoute, render_envoy_config, generate_gateway_tls

pytestmark = pytest.mark.no_db


def test_gateway_config_routes_applications_with_auth_headers_in_deterministic_order() -> None:
    """Render Envoy routes from desired Applications without cluster discovery."""

    # Define unsorted routes for two Applications.
    first_organization_id = UUID("10000000-0000-4000-8000-000000000001")
    second_organization_id = UUID("10000000-0000-4000-8000-000000000002")
    routes = (
        GatewayRoute(
            id=UUID("20000000-0000-4000-8000-000000000002"),
            namespace=second_organization_id.hex,
        ),
        GatewayRoute(
            id=UUID("20000000-0000-4000-8000-000000000001"),
            namespace=first_organization_id.hex,
        ),
    )

    # Render and parse the Envoy gateway configuration.
    config = yaml.safe_load(render_envoy_config(routes))

    # Verify authenticated routes and clusters have deterministic ordering.
    listeners = config["static_resources"]["listeners"]
    routes = listeners[0]["filter_chains"][0]["filters"][0]["typed_config"]["route_config"]["virtual_hosts"][0]["routes"]
    clusters = config["static_resources"]["clusters"]
    assert len(listeners) == 1
    assert len(routes) == 2
    assert routes[0]["route"]["cluster"] == f"{first_organization_id.hex}-20000000-0000-4000-8000-000000000001"
    assert routes[1]["route"]["cluster"] == f"{second_organization_id.hex}-20000000-0000-4000-8000-000000000002"
    assert routes[0]["match"]["headers"] == [
        {
            "name": "x-longlink-application-id",
            "string_match": {"exact": "20000000-0000-4000-8000-000000000001"},
        }
    ]
    assert [cluster["name"] for cluster in clusters] == [
        f"{first_organization_id.hex}-20000000-0000-4000-8000-000000000001",
        f"{second_organization_id.hex}-20000000-0000-4000-8000-000000000002",
    ]


def test_gateway_tls_covers_the_compute_address() -> None:
    """Generate a gateway certificate trusted by its private compute CA."""

    # Generate material for one IPv4 compute gateway address.
    compute_id = UUID("00000000-0000-4000-8000-000000000001")
    address = ipaddress.ip_address("192.0.2.1")
    material = generate_gateway_tls(compute_id, address)

    # Verify the server certificate preserves its issuing CA and gateway IP SAN.
    ca_certificate = x509.load_pem_x509_certificate(material.ca_certificate.encode("ascii"))
    certificate = x509.load_pem_x509_certificate(material.identity_certificate.encode("ascii"))
    names = certificate.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
    assert certificate.issuer == ca_certificate.subject
    assert names.get_values_for_type(x509.IPAddress) == [address]
    assert certificate.not_valid_after_utc - certificate.not_valid_before_utc == timedelta(days=3650, minutes=5)
