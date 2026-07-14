import json
import kr8s
import yaml
import base64
import hashlib
from io import StringIO
from typing import Any
from src.utils import names, templates
from src.environments import env
from importlib.resources import files
from kr8s.asyncio.objects import Service
from src.kubernetes.resources import KubernetesResources

TEMPLATES = files("src.kubernetes.templates")


class Gateway:
    """Manage the private Envoy gateway for one Kubernetes cluster."""

    def __init__(self, resources: KubernetesResources, proxy_secret: str) -> None:
        """Initialize gateway management with shared cluster resources."""

        self._resources = resources
        self._proxy_secret = proxy_secret

    async def _routes(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Return Envoy routes and clusters for all managed application services."""

        routes: list[dict[str, Any]] = []
        clusters: list[dict[str, Any]] = []
        gateway_secret_match = {
            "name": "x-longlink-gateway-secret",
            "string_match": {"exact": "__LONG_LINK_GATEWAY_SECRET__"},
        }

        # Discover every managed Service in one cluster request.
        services = sorted(
            await self._resources.list(Service, kr8s.ALL, {"compute-role": "application"}),
            key=lambda item: (item.namespace or "", item.name),
        )

        # Build one route and one cluster for each routable application Service.
        for service in services:
            namespace = service.namespace
            application_id = service.labels.get("longlink.io/application-id")
            service_ports = service.spec.get("ports", [])

            # System namespaces and incomplete Services cannot become application routes.
            if namespace is None or namespace in names.KUBERNETES_SYSTEM_NAMESPACES or application_id is None or not service_ports:
                continue

            service_name = service.name
            service_port = service_ports[0].port
            cluster_name = f"{namespace}-{service_name}"
            service_host = f"{service_name}.{namespace}.svc.cluster.local"
            application_id_match = {
                "name": "x-longlink-application-id",
                "string_match": {"exact": application_id},
            }

            # Header-matched routes forward API-authenticated app traffic.
            routes.append(
                {
                    "match": {
                        "prefix": "/",
                        "headers": [gateway_secret_match, application_id_match],
                    },
                    "route": {
                        "cluster": cluster_name,
                        "timeout": "300s",
                    },
                    "request_headers_to_remove": ["x-longlink-gateway-secret", "x-longlink-application-id"],
                }
            )

            # Each app Service gets a DNS-backed cluster target inside its organization namespace.
            clusters.append(
                {
                    "name": cluster_name,
                    "connect_timeout": "5s",
                    "type": "STRICT_DNS",
                    "load_assignment": {
                        "cluster_name": cluster_name,
                        "endpoints": [
                            {
                                "lb_endpoints": [
                                    {
                                        "endpoint": {
                                            "address": {
                                                "socket_address": {
                                                    "address": service_host,
                                                    "port_value": service_port,
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        ],
                    },
                }
            )

        return routes, clusters

    async def _config(self) -> str:
        """Render the Envoy configuration for the current application service set."""

        application_routes, application_clusters = await self._routes()
        routes = [
            {
                "match": {"path": "/ready"},
                "direct_response": {"status": 200, "body": {"inline_string": "ready"}},
            },
            *application_routes,
            {
                "match": {"prefix": "/"},
                "direct_response": {"status": 404, "body": {"inline_string": "Not found"}},
            },
        ]

        # Render static Envoy configuration with the discovered routes and clusters.
        config = templates.readyml_list(
            TEMPLATES.joinpath("envoy.yml"),
            routes=json.dumps(routes),
            clusters=json.dumps(application_clusters),
        )[0]
        stream = StringIO()
        yaml.safe_dump(config, stream=stream, sort_keys=False)
        return stream.getvalue()

    def _manifests(self, envoy_config: str) -> list[dict[str, Any]]:
        """Return Kubernetes manifests for the per-cluster Envoy gateway."""

        config_hash = hashlib.sha256(envoy_config.encode("utf-8")).hexdigest()
        manifests = templates.readyml_list(
            TEMPLATES.joinpath("gateway.yml"),
            config_hash=config_hash,
            envoy_config=json.dumps(envoy_config),
            gateway_secret=base64.b64encode(self._proxy_secret.encode("utf-8")).decode("ascii"),
        )

        # Development needs an Ingress resource because the local gateway service stays ClusterIP.
        if env.DEVELOPMENT:
            manifests.extend(templates.readyml_list(TEMPLATES.joinpath("gateway_development_ingress.yml")))

        return manifests

    async def sync(self) -> None:
        """Apply the current Envoy gateway configuration."""

        envoy_config = await self._config()

        # The gateway Namespace is the first manifest, so later namespaced resources can be applied in order.
        for manifest in self._manifests(envoy_config):
            await self._resources.upsert(manifest)
