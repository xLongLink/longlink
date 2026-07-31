import yaml
import pytest
from uuid import UUID
from src.kubernetes.gateway import GatewayRoute, render_envoy_config

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
    config = yaml.safe_load(render_envoy_config(routes))

    # Verify authenticated routes and clusters have deterministic ordering.
    listeners = config["static_resources"]["listeners"]
    routes = listeners[0]["filter_chains"][0]["filters"][0]["typed_config"]["route_config"]["virtual_hosts"][0]["routes"]
    clusters = config["static_resources"]["clusters"]
    assert len(listeners) == 1
    assert len(routes) == 2
    assert routes[0]["route"]["cluster"] == "acme-20000000-0000-4000-8000-000000000001"
    assert routes[1]["route"]["cluster"] == "beta-20000000-0000-4000-8000-000000000002"
    assert routes[0]["match"]["headers"] == [
        {
            "name": "x-longlink-application-id",
            "string_match": {"exact": "20000000-0000-4000-8000-000000000001"},
        }
    ]
    assert [cluster["name"] for cluster in clusters] == [
        "acme-20000000-0000-4000-8000-000000000001",
        "beta-20000000-0000-4000-8000-000000000002",
    ]
