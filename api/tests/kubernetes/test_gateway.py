import yaml
import pytest
from uuid import UUID
from src.kubernetes.gateway import GatewayRoute, render_envoy_config

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
