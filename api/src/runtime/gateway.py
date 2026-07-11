import json
import yaml
import base64
import hashlib
from typing import Any
from .library import Service, Namespace, kr8s
from src.utils import names, templates
from .resources import KubernetesResources
from src.constants import ROOT, GATEWAY_SECRET_HEADER, GATEWAY_APPLICATION_HEADER
from src.environments import env


class KubernetesGateway(KubernetesResources):
    """Manage the cluster gateway namespace, manifests, and Envoy config."""

    async def setup(self) -> None:
        """Create or refresh the per-cluster Envoy gateway."""

        await self._sync_gateway()

    async def _ensure_gateway_namespace(self) -> None:
        """Create the dedicated gateway namespace when it is missing."""

        # Create the gateway namespace if it is absent.
        try:
            await self._read(Namespace, "longlink-system")
        except kr8s.ServerError as exc:

            # Non-404 failures mean Kubernetes could not confirm gateway namespace state.
            if not self._not_found(exc):
                raise ValueError("Failed reading namespace 'longlink-system'") from exc

            resource = await self._resource(
                {
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {"name": "longlink-system"},
                }
            )
            await resource.create()

    async def _gateway_routes(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Return Envoy routes and clusters for all managed application services."""

        routes: list[dict[str, Any]] = []
        clusters: list[dict[str, Any]] = []
        gateway_secret_match = {
            "name": GATEWAY_SECRET_HEADER,
            "string_match": {"exact": "__LONG_LINK_GATEWAY_SECRET__"},
        }

        # Discover app services from organization namespaces so Envoy config mirrors deployed workloads.
        namespaces = sorted(
            await self._list(Namespace),
            key=lambda item: item.name,
        )

        # Build routes for each organization namespace except the gateway namespace.
        for namespace_object in namespaces:
            namespace = namespace_object.name

            # Kubernetes system namespaces do not host application services.
            if namespace in names.KUBERNETES_SYSTEM_NAMESPACES:
                continue

            # Only managed application services become gateway routes.
            services = sorted(
                await self._list(
                    Service,
                    namespace,
                    {"compute-role": "application"},
                ),
                key=lambda item: item.name,
            )

            # Add one route pair and one cluster for each routable application service.
            for service in services:
                application_id = service.labels.get("longlink.io/application-id")
                service_ports = service.spec.get("ports", [])

                # Services without platform identity or ports cannot be proxied safely.
                if application_id is None or not service_ports:
                    continue

                service_name = service.name
                service_port = service_ports[0].port
                cluster_name = f"{namespace}-{service_name}"
                service_host = f"{service_name}.{namespace}.svc.cluster.local"

                application_id_match = {
                    "name": GATEWAY_APPLICATION_HEADER,
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
                        "request_headers_to_remove": [GATEWAY_SECRET_HEADER, GATEWAY_APPLICATION_HEADER],
                    }
                )

                # Each app service gets a DNS-backed cluster target inside the organization namespace.
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

    async def _gateway_config(self) -> str:
        """Render the Envoy configuration for the current application service set."""

        application_routes, application_clusters = await self._gateway_routes()

        # Keep health checks independent from application routing and gateway secrets.
        health_route = {
            "match": {"path": "/ready"},
            "direct_response": {"status": 200, "body": {"inline_string": "ready"}},
        }

        # Evaluate app routes before the final catch-all so unknown paths return a stable 404.
        routes = [
            health_route,
            *application_routes,
            {
                "match": {"prefix": "/"},
                "direct_response": {"status": 404, "body": {"inline_string": "Not found"}},
            },
        ]

        # Envoy only fronts API-authenticated app traffic and forwards to internal ClusterIP services.
        http_connection_manager = {
            "@type": "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager",
            "stat_prefix": "longlink_gateway",
            "codec_type": "AUTO",
            "max_request_headers_kb": 64,
            "stream_idle_timeout": "300s",
            "request_timeout": "300s",
            "common_http_protocol_options": {"idle_timeout": "300s"},
            "access_log": [
                {
                    "name": "envoy.access_loggers.stdout",
                    "typed_config": {
                        "@type": "type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog",
                        "log_format": {
                            "text_format_source": {
                                "inline_string": '[%START_TIME%] "%REQ(:METHOD)% %REQ(:PATH)%" %RESPONSE_CODE% %DURATION%ms %UPSTREAM_HOST%\n'
                            }
                        },
                    },
                }
            ],
            "route_config": {
                "name": "local_route",
                "virtual_hosts": [
                    {
                        "name": "applications",
                        "domains": ["*"],
                        "routes": routes,
                    }
                ],
            },
            "http_filters": [
                {
                    "name": "envoy.filters.http.local_ratelimit",
                    "typed_config": {
                        "@type": "type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit",
                        "stat_prefix": "longlink_gateway_rate_limit",
                        "token_bucket": {
                            "max_tokens": 1000,
                            "tokens_per_fill": 1000,
                            "fill_interval": "1s",
                        },
                        "filter_enabled": {
                            "default_value": {"numerator": 100, "denominator": "HUNDRED"}
                        },
                        "filter_enforced": {
                            "default_value": {"numerator": 100, "denominator": "HUNDRED"}
                        },
                    },
                },
                {
                    "name": "envoy.filters.http.router",
                    "typed_config": {
                        "@type": "type.googleapis.com/envoy.extensions.filters.http.router.v3.Router"
                    },
                },
            ],
        }
        filter_chain: dict[str, Any] = {
            "filters": [
                {
                    "name": "envoy.filters.network.http_connection_manager",
                    "typed_config": http_connection_manager,
                }
            ]
        }

        config = {
            "admin": {
                "access_log_path": "/tmp/envoy-admin.log",
                "address": {
                    "socket_address": {"address": "127.0.0.1", "port_value": 9901}
                },
            },
            "static_resources": {
                "listeners": [
                    {
                        "name": "listener_0",
                        "per_connection_buffer_limit_bytes": 1024 * 1024,
                        "address": {
                            "socket_address": {"address": "0.0.0.0", "port_value": 8443}
                        },
                        "filter_chains": [filter_chain],
                    }
                ],
                "clusters": application_clusters,
            }
        }
        return yaml.safe_dump(config, sort_keys=False)

    def _gateway_manifests(self, envoy_config: str) -> list[dict[str, Any]]:
        """Return Kubernetes manifests for the per-cluster Envoy gateway."""

        config_hash = hashlib.sha256(envoy_config.encode("utf-8")).hexdigest()
        gateway_scheme = "HTTP"
        volume_mounts: list[dict[str, Any]] = [
            {"name": "config", "mountPath": "/etc/envoy"},
            {"name": "tmp", "mountPath": "/tmp"},
        ]
        volumes: list[dict[str, Any]] = [
            {"name": "template", "configMap": {"name": "longlink-gateway"}},
            {"name": "config", "emptyDir": {}},
            {"name": "tmp", "emptyDir": {}},
        ]

        # Local development can use an Ingress; managed clusters keep the gateway private.
        use_development_ingress = env.DEVELOPMENT
        gateway_service_port = 80
        service_spec: dict[str, Any] = {
            "type": "ClusterIP",
            "selector": {"app": "longlink-gateway"},
            "ports": [
                {
                    "name": "gateway",
                    "protocol": "TCP",
                    "port": gateway_service_port,
                    "targetPort": "gateway",
                }
            ],
        }

        template_context: dict[str, object] = {
            "config_hash": config_hash,
            "envoy_config": json.dumps(envoy_config),
            "gateway_scheme": gateway_scheme,
            "gateway_secret": base64.b64encode(self._proxy_secret.encode("utf-8")).decode("ascii"),
            "gateway_service_port": gateway_service_port,
            "gateway_service_spec": json.dumps(service_spec),
            "gateway_volume_mounts": json.dumps(volume_mounts),
            "gateway_volumes": json.dumps(volumes),
        }
        manifests = templates.readyml_list(ROOT / "templates" / "gateway.yml", **template_context)

        # Development needs an Ingress resource because the local gateway service stays ClusterIP.
        if use_development_ingress:
            ingress_manifests = templates.readyml_list(
                ROOT / "templates" / "gateway_development_ingress.yml",
                **template_context,
            )
            manifests.extend(ingress_manifests)

        return manifests

    async def _sync_gateway(self) -> None:
        """Apply the current Envoy gateway configuration and restart pods when it changes."""

        await self._ensure_gateway_namespace()
        envoy_config = await self._gateway_config()

        # Apply all rendered manifests, with a development-only Service type recreation fallback.
        for manifest in self._gateway_manifests(envoy_config):

            # Service type changes are immutable, so local development needs a recreation path.
            if manifest["kind"] == "Service":

                # Upsert first because production should only need normal patch/create behavior.
                try:
                    await self._upsert(manifest)
                except ValueError as exc:

                    # Production must not silently recreate the externally exposed gateway Service.
                    if not env.DEVELOPMENT:
                        raise ValueError(f"Failed updating Service '{manifest['metadata']['name']}'") from exc

                    # Development may replace old gateway Services left by earlier local configurations.
                    await self._delete(Service, manifest["metadata"]["name"], "longlink-system")
                    resource = await self._resource(manifest)
                    await resource.create()

                continue

            await self._upsert(manifest)
