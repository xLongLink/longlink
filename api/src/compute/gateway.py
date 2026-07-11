import json
import yaml
import base64
import hashlib
import urllib.parse
from typing import Any
from src.utils import templates
from .constants import (GATEWAY_NAME, GATEWAY_IMAGE, GATEWAY_NAMESPACE, GATEWAY_CONFIG_NAME, APPLICATION_ID_LABEL,
                        GATEWAY_SERVICE_PORT, GATEWAY_CONTAINER_PORT, GATEWAY_TLS_MOUNT_PATH, GATEWAY_NAMESPACE_LABEL,
                        GATEWAY_TLS_SECRET_NAME, GATEWAY_AUTH_SECRET_NAME, GATEWAY_SECRET_HEADER,
                        GATEWAY_CONFIG_MOUNT_PATH, GATEWAY_CONFIG_RENDER_IMAGE, GATEWAY_TEMPLATE_MOUNT_PATH,
                        GATEWAY_ADMIN_CONTAINER_PORT, GATEWAY_MAX_REQUEST_HEADERS_KB, GATEWAY_AUTH_SECRET_PLACEHOLDER,
                        GATEWAY_PER_CONNECTION_BUFFER_LIMIT_BYTES)
from .resources import KubernetesResources
from src.constants import ROOT
from src.environments import env
from .library import Service, Namespace, kr8s


class KubernetesGateway(KubernetesResources):
    """Manage the cluster gateway namespace, manifests, and Envoy config."""

    async def setup(self) -> None:
        """Create or refresh the per-cluster Envoy gateway."""

        await self._sync_gateway()

    async def _ensure_gateway_namespace(self) -> None:
        """Create the dedicated gateway namespace when it is missing."""

        # Create the namespace if it is absent; otherwise only LongLink-managed namespaces may be reused.
        try:
            namespace = await self._read(Namespace, GATEWAY_NAMESPACE)
        except kr8s.ServerError as exc:

            # Non-404 failures mean Kubernetes could not confirm gateway namespace state.
            if not self._not_found(exc):
                raise ValueError(f"Failed reading namespace '{GATEWAY_NAMESPACE}'") from exc

            resource = await self._resource(
                {
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {
                        "name": GATEWAY_NAMESPACE,
                        "labels": {"managed-by": "longlink", GATEWAY_NAMESPACE_LABEL: "true"},
                    },
                }
            )
            await resource.create()
            return None

        self._validate_managed_namespace(GATEWAY_NAMESPACE, namespace)
        labels = namespace.metadata.get("labels", {})

        # Keep the gateway namespace discoverable by network policy and gateway maintenance code.
        if labels.get(GATEWAY_NAMESPACE_LABEL) != "true":
            await namespace.patch({"metadata": {"labels": {**labels, GATEWAY_NAMESPACE_LABEL: "true"}}})

    def _gateway_domain(self) -> str:
        """Return the gateway Host header domain, including a custom port when configured."""

        value = self._ingress_host.strip().rstrip("/")
        parsed_url = urllib.parse.urlsplit(value)

        # Full URL values should keep their host and optional port only.
        if parsed_url.scheme in {"http", "https"} and parsed_url.netloc:
            return parsed_url.netloc

        return value.split("/", 1)[0]

    def _gateway_uses_tls(self) -> bool:
        """Return whether the gateway should terminate TLS itself."""

        return bool((self._gateway_tls_key or "").strip() and (self._gateway_tls_certificate or "").strip())

    async def _gateway_routes(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Return Envoy routes and clusters for all managed application services."""

        routes: list[dict[str, Any]] = []
        clusters: list[dict[str, Any]] = []

        # Discover app services from managed namespaces so Envoy config mirrors deployed workloads.
        namespaces = sorted(
            await self._list(Namespace, label_selector={"managed-by": "longlink"}),
            key=lambda item: item.name,
        )

        # Build routes for each managed organization namespace except the gateway namespace.
        for namespace_object in namespaces:
            namespace = namespace_object.name

            # The gateway namespace hosts infrastructure, not application services.
            if namespace == GATEWAY_NAMESPACE:
                continue

            # Only managed application services become gateway routes.
            services = sorted(
                await self._list(
                    Service,
                    namespace,
                    {"managed-by": "longlink", "compute-role": "application"},
                ),
                key=lambda item: item.name,
            )

            # Add one route pair and one cluster for each routable application service.
            for service in services:
                application_id = service.labels.get(APPLICATION_ID_LABEL)
                service_ports = service.spec.get("ports", [])

                # Services without platform identity or ports cannot be proxied safely.
                if application_id is None or not service_ports:
                    continue

                service_name = service.name
                service_port = service_ports[0].port
                cluster_name = f"{namespace}-{service_name}"
                service_host = f"{service_name}.{namespace}.svc.cluster.local"

                # The cluster gateway only accepts requests authenticated by the API proxy.
                gateway_secret_match = {
                    "name": GATEWAY_SECRET_HEADER,
                    "string_match": {"exact": GATEWAY_AUTH_SECRET_PLACEHOLDER},
                }

                # Secret-matched routes forward to the app and remove the secret before the app sees it.
                routes.append(
                    {
                        "match": {
                            "prefix": f"/api/applications/{application_id}/proxy/",
                            "headers": [gateway_secret_match],
                        },
                        "route": {
                            "cluster": cluster_name,
                            "prefix_rewrite": "/",
                            "timeout": "300s",
                        },
                        "request_headers_to_remove": [GATEWAY_SECRET_HEADER],
                    }
                )

                # Requests that bypass the API proxy match the same path but fail before reaching the app.
                routes.append(
                    {
                        "match": {"prefix": f"/api/applications/{application_id}/proxy/"},
                        "direct_response": {"status": 403, "body": {"inline_string": "Forbidden"}},
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
            "max_request_headers_kb": GATEWAY_MAX_REQUEST_HEADERS_KB,
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
                        "name": "health",
                        "domains": ["*"],
                        "routes": [health_route],
                    },
                    {
                        "name": "applications",
                        "domains": [self._gateway_domain()],
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

        # Add TLS termination only when production gateway certificate material is configured.
        if self._gateway_uses_tls():
            filter_chain["transport_socket"] = {
                "name": "envoy.transport_sockets.tls",
                "typed_config": {
                    "@type": "type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext",
                    "common_tls_context": {
                        "tls_certificates": [
                            {
                                "certificate_chain": {"filename": f"{GATEWAY_TLS_MOUNT_PATH}/tls.crt"},
                                "private_key": {"filename": f"{GATEWAY_TLS_MOUNT_PATH}/tls.key"},
                            }
                        ]
                    },
                },
            }

        config = {
            "admin": {
                "access_log_path": "/tmp/envoy-admin.log",
                "address": {
                    "socket_address": {"address": "127.0.0.1", "port_value": GATEWAY_ADMIN_CONTAINER_PORT}
                },
            },
            "static_resources": {
                "listeners": [
                    {
                        "name": "listener_0",
                        "per_connection_buffer_limit_bytes": GATEWAY_PER_CONNECTION_BUFFER_LIMIT_BYTES,
                        "address": {
                            "socket_address": {"address": "0.0.0.0", "port_value": GATEWAY_CONTAINER_PORT}
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
        gateway_uses_tls = self._gateway_uses_tls()
        gateway_scheme = "HTTPS" if gateway_uses_tls else "HTTP"
        volume_mounts: list[dict[str, Any]] = [
            {"name": "config", "mountPath": GATEWAY_CONFIG_MOUNT_PATH},
            {"name": "tmp", "mountPath": "/tmp"},
        ]
        volumes: list[dict[str, Any]] = [
            {"name": "template", "configMap": {"name": GATEWAY_CONFIG_NAME}},
            {"name": "config", "emptyDir": {}},
            {"name": "tmp", "emptyDir": {}},
        ]

        # Mount TLS material only when Envoy terminates HTTPS itself.
        if gateway_uses_tls:
            volume_mounts.append(
                {"name": "tls", "mountPath": GATEWAY_TLS_MOUNT_PATH, "readOnly": True}
            )
            volumes.append({"name": "tls", "secret": {"secretName": GATEWAY_TLS_SECRET_NAME}})

        # Local development can use an Ingress on port 80; production exposes the gateway service directly.
        use_development_ingress = env.DEVELOPMENT and not gateway_uses_tls
        gateway_service_port = 80 if use_development_ingress else GATEWAY_SERVICE_PORT
        service_spec: dict[str, Any] = {
            "type": "ClusterIP" if use_development_ingress else "LoadBalancer",
            "selector": {"app": GATEWAY_NAME},
            "ports": [
                {
                    "name": "gateway",
                    "protocol": "TCP",
                    "port": gateway_service_port,
                    "targetPort": "gateway",
                }
            ],
        }

        # Preserve static load balancer assignments when production infrastructure requires one.
        if (
            not use_development_ingress
            and self._gateway_load_balancer_ip is not None
            and self._gateway_load_balancer_ip.strip()
        ):
            service_spec["loadBalancerIP"] = self._gateway_load_balancer_ip.strip()

        template_context: dict[str, object] = {
            "config_hash": config_hash,
            "envoy_config": json.dumps(envoy_config),
            "gateway_admin_container_port": GATEWAY_ADMIN_CONTAINER_PORT,
            "gateway_auth_secret_name": GATEWAY_AUTH_SECRET_NAME,
            "gateway_auth_secret_placeholder": GATEWAY_AUTH_SECRET_PLACEHOLDER,
            "gateway_config_mount_path": GATEWAY_CONFIG_MOUNT_PATH,
            "gateway_config_name": GATEWAY_CONFIG_NAME,
            "gateway_config_render_image": GATEWAY_CONFIG_RENDER_IMAGE,
            "gateway_container_port": GATEWAY_CONTAINER_PORT,
            "gateway_image": GATEWAY_IMAGE,
            "gateway_name": GATEWAY_NAME,
            "gateway_namespace": GATEWAY_NAMESPACE,
            "gateway_scheme": gateway_scheme,
            "gateway_secret": base64.b64encode(self._proxy_secret.encode("utf-8")).decode("ascii"),
            "gateway_service_port": gateway_service_port,
            "gateway_service_spec": json.dumps(service_spec),
            "gateway_template_mount_path": GATEWAY_TEMPLATE_MOUNT_PATH,
            "gateway_volume_mounts": json.dumps(volume_mounts),
            "gateway_volumes": json.dumps(volumes),
        }
        manifests = templates.readyml_list(ROOT / "templates" / "gateway.yml", **template_context)

        # Insert the TLS Secret before the ConfigMap so referenced certificate data exists with the deployment.
        if gateway_uses_tls:
            tls_manifests = templates.readyml_list(
                ROOT / "templates" / "gateway_tls_secret.yml",
                **template_context,
                gateway_tls_certificate=base64.b64encode(
                    (self._gateway_tls_certificate or "").encode("utf-8")
                ).decode("ascii"),
                gateway_tls_key=base64.b64encode(
                    (self._gateway_tls_key or "").encode("utf-8")
                ).decode("ascii"),
                gateway_tls_secret_name=GATEWAY_TLS_SECRET_NAME,
            )
            manifests[1:1] = tls_manifests

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

                    # Development may switch the local gateway between direct LoadBalancer and Traefik Ingress modes.
                    await self._delete(Service, manifest["metadata"]["name"], GATEWAY_NAMESPACE)
                    resource = await self._resource(manifest)
                    await resource.create()

                continue

            await self._upsert(manifest)
