import base64
import hashlib
import urllib.parse
import yaml
from .base import Compute
from typing import Any
from datetime import UTC, datetime
from src.utils import names, templates
from kubernetes import client, config
from src.environments import env, resolve_cors_origins
from src.logger import logger
from src.constants import TEMPLATES
from collections.abc import Callable
from src.utils.namespace import k8name
from kubernetes.client.exceptions import ApiException
from kubernetes.utils.quantity import parse_quantity

GATEWAY_NAME = "longlink-gateway"
GATEWAY_NAMESPACE = "longlink-system"
GATEWAY_CONFIG_NAME = "longlink-gateway"
GATEWAY_AUTH_SECRET_NAME = "longlink-gateway-auth"
GATEWAY_TLS_SECRET_NAME = "longlink-gateway-tls"
GATEWAY_CONFIG_MOUNT_PATH = "/etc/envoy"
GATEWAY_TEMPLATE_MOUNT_PATH = "/etc/envoy-template"
GATEWAY_TLS_MOUNT_PATH = "/etc/longlink/tls"
GATEWAY_CONTAINER_PORT = 8443
GATEWAY_ADMIN_CONTAINER_PORT = 9901
GATEWAY_SERVICE_PORT = 443
GATEWAY_IMAGE = "envoyproxy/envoy:v1.31.5"
GATEWAY_CONFIG_RENDER_IMAGE = "busybox:1.36.1"
GATEWAY_NAMESPACE_LABEL = "longlink.io/gateway"
APPLICATION_ID_LABEL = "longlink.io/application-id"
GATEWAY_AUTH_SECRET_PLACEHOLDER = "__LONG_LINK_GATEWAY_SECRET__"
GATEWAY_MAX_REQUEST_HEADERS_KB = 64
GATEWAY_PER_CONNECTION_BUFFER_LIMIT_BYTES = 1024 * 1024
GATEWAY_IDENTITY_HEADERS = [
    "x-user-id",
    "x-user-role",
    "x-longlink-application-id",
    "x-longlink-application-slug",
    "x-longlink-organization-id",
    "x-longlink-organization-slug",
]


class K8s(Compute):
    """Manage Kubernetes namespaces, application workloads, and the cluster gateway."""

    def __init__(
        self,
        kubeconfig: str,
        proxy_secret: str,
        ingress_host: str,
        *,
        gateway_tls_key: str | None = None,
        gateway_tls_certificate: str | None = None,
        gateway_load_balancer_ip: str | None = None,
    ) -> None:
        """Initialize the Kubernetes compute adapter."""

        self._kubeconfig = kubeconfig
        self._proxy_secret = proxy_secret
        self._ingress_host = ingress_host
        self._gateway_tls_key = gateway_tls_key
        self._gateway_tls_certificate = gateway_tls_certificate
        self._gateway_load_balancer_ip = gateway_load_balancer_ip
        kubernetes_client: Any = client
        kubernetes_config: Any = config
        configuration = kubernetes_client.Configuration()
        loader = kubernetes_config.kube_config.KubeConfigLoader(yaml.safe_load(self._kubeconfig))
        loader.load_and_set(configuration)
        self._api_client: Any = kubernetes_client.ApiClient(configuration)
        self._core_api: Any = kubernetes_client.CoreV1Api(self._api_client)
        self._apps_api: Any = kubernetes_client.AppsV1Api(self._api_client)
        self._networking_api: Any = kubernetes_client.NetworkingV1Api(self._api_client)

    async def setup(self) -> None:
        """Create or refresh the per-cluster Envoy gateway."""

        self._sync_gateway()

    def _upsert(
        self,
        create_call: Callable[..., Any],
        patch_call: Callable[..., Any],
        namespace: str,
        name: str,
        body: dict[str, Any],
    ) -> None:
        """Create a resource when missing, otherwise patch the live object."""

        try:
            patch_call(name, namespace, body)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed updating {body['kind']} '{name}'") from exc

            create_call(namespace, body)

    def _pods(self, organization: str, application: str) -> list[client.V1Pod]:
        """Return pods for one managed application."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")
        return self._core_api.list_namespaced_pod(namespace, label_selector=f"app={name}").items

    def _validate_managed_namespace(self, namespace: str, namespace_object: Any) -> None:
        """Raise when one namespace is not owned by LongLink."""

        labels = (namespace_object.metadata.labels or {}) if namespace_object.metadata is not None else {}
        if labels.get("managed-by") != "longlink":
            raise ValueError(f"Namespace '{namespace}' is not managed by LongLink")

    def _ensure_gateway_namespace(self) -> None:
        """Create the dedicated gateway namespace when it is missing."""

        try:
            namespace = self._core_api.read_namespace(GATEWAY_NAMESPACE)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed reading namespace '{GATEWAY_NAMESPACE}'") from exc

            self._core_api.create_namespace(
                {
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {
                        "name": GATEWAY_NAMESPACE,
                        "labels": {"managed-by": "longlink", GATEWAY_NAMESPACE_LABEL: "true"},
                    },
                }
            )
            return None

        self._validate_managed_namespace(GATEWAY_NAMESPACE, namespace)
        labels = namespace.metadata.labels or {}
        if labels.get(GATEWAY_NAMESPACE_LABEL) != "true":
            self._core_api.patch_namespace(
                GATEWAY_NAMESPACE,
                {"metadata": {"labels": {**labels, GATEWAY_NAMESPACE_LABEL: "true"}}},
            )

    def _application_network_policy(self, namespace: str) -> dict[str, Any]:
        """Return the ingress policy that only allows gateway traffic to app pods."""

        return {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "NetworkPolicy",
            "metadata": {
                "name": "longlink-gateway-ingress",
                "namespace": namespace,
                "labels": {"managed-by": "longlink"},
            },
            "spec": {
                "podSelector": {"matchLabels": {"compute-role": "application"}},
                "policyTypes": ["Ingress"],
                "ingress": [
                    {
                        "from": [
                            {
                                "namespaceSelector": {"matchLabels": {GATEWAY_NAMESPACE_LABEL: "true"}},
                                "podSelector": {"matchLabels": {"app": GATEWAY_NAME}},
                            }
                        ]
                    }
                ],
            },
        }

    def _apply_application_network_policy(self, namespace: str) -> None:
        """Create or patch the namespace ingress policy for application pods."""

        body = self._application_network_policy(namespace)
        self._upsert(
            self._networking_api.create_namespaced_network_policy,
            self._networking_api.patch_namespaced_network_policy,
            namespace,
            body["metadata"]["name"],
            body,
        )

    def _gateway_domain(self) -> str:
        """Return the gateway Host header domain, including a custom port when configured."""

        value = self._ingress_host.strip().rstrip("/")
        parsed_url = urllib.parse.urlsplit(value)
        if parsed_url.scheme in {"http", "https"} and parsed_url.netloc:
            return parsed_url.netloc

        return value.split("/", 1)[0]

    def _gateway_uses_tls(self) -> bool:
        """Return whether the gateway should terminate TLS itself."""

        return bool((self._gateway_tls_key or "").strip() and (self._gateway_tls_certificate or "").strip())

    def _control_plane_cluster(self) -> tuple[str, dict[str, Any]]:
        """Return the control-plane origin and Envoy cluster for authorization calls."""

        parsed_url = urllib.parse.urlsplit(env.CONTROL_PLANE_URL.rstrip("/"))
        if parsed_url.scheme not in {"http", "https"} or not parsed_url.hostname:
            raise ValueError("CONTROL_PLANE_URL must be an absolute HTTP(S) URL")

        port = parsed_url.port or (443 if parsed_url.scheme == "https" else 80)
        origin = f"{parsed_url.scheme}://{parsed_url.netloc}"
        cluster: dict[str, Any] = {
            "name": "longlink-control-plane",
            "connect_timeout": "5s",
            "type": "STRICT_DNS",
            "load_assignment": {
                "cluster_name": "longlink-control-plane",
                "endpoints": [
                    {
                        "lb_endpoints": [
                            {
                                "endpoint": {
                                    "address": {
                                        "socket_address": {
                                            "address": parsed_url.hostname,
                                            "port_value": port,
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ],
            },
        }
        if parsed_url.scheme == "https":
            cluster["transport_socket"] = {
                "name": "envoy.transport_sockets.tls",
                "typed_config": {
                    "@type": "type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.UpstreamTlsContext",
                    "sni": parsed_url.hostname,
                },
            }

        return origin, cluster

    def _gateway_routes(self) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Return Envoy routes and clusters for all managed application services."""

        routes: list[dict[str, Any]] = []
        clusters: list[dict[str, Any]] = []
        namespaces = sorted(
            self._core_api.list_namespace(label_selector="managed-by=longlink").items,
            key=lambda item: item.metadata.name if item.metadata is not None else "",
        )

        for namespace_object in namespaces:
            metadata = namespace_object.metadata
            namespace = metadata.name if metadata is not None else None
            if namespace is None or namespace == GATEWAY_NAMESPACE:
                continue

            services = sorted(
                self._core_api.list_namespaced_service(
                    namespace,
                    label_selector="managed-by=longlink,compute-role=application",
                ).items,
                key=lambda item: item.metadata.name if item.metadata is not None else "",
            )
            for service in services:
                service_metadata = service.metadata
                service_spec = service.spec
                if service_metadata is None or service_metadata.name is None or service_spec is None:
                    continue

                application_id = (service_metadata.labels or {}).get(APPLICATION_ID_LABEL)
                service_ports = service_spec.ports or []
                if application_id is None or not service_ports:
                    continue

                service_name = service_metadata.name
                service_port = service_ports[0].port
                cluster_name = f"{namespace}-{service_name}"
                service_host = f"{service_name}.{namespace}.svc.cluster.local"

                routes.append(
                    {
                        "match": {"prefix": f"/api/applications/{application_id}/proxy/"},
                        "route": {
                            "cluster": cluster_name,
                            "prefix_rewrite": "/",
                            "timeout": "300s",
                        },
                    }
                )
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

    def _gateway_config(self) -> str:
        """Render the Envoy configuration for the current application service set."""

        application_routes, application_clusters = self._gateway_routes()
        control_plane_origin, control_plane_cluster = self._control_plane_cluster()
        allowed_origins = [
            {"exact": origin}
            for origin in sorted({control_plane_origin, *resolve_cors_origins(env.DEVELOPMENT, env.CORS_ORIGINS)})
        ]
        health_route = {
            "match": {"path": "/ready"},
            "direct_response": {"status": 200, "body": {"inline_string": "ready"}},
            "typed_per_filter_config": {
                "envoy.filters.http.ext_authz": {
                    "@type": "type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthzPerRoute",
                    "disabled": True,
                }
            },
        }
        routes = [
            health_route,
            *application_routes,
            {
                "match": {"prefix": "/"},
                "direct_response": {"status": 404, "body": {"inline_string": "Not found"}},
            },
        ]
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
                        "cors": {
                            "allow_origin_string_match": allowed_origins,
                            "allow_methods": "DELETE,GET,OPTIONS,PATCH,POST,PUT",
                            "allow_headers": "accept,authorization,content-type,x-requested-with",
                            "allow_credentials": True,
                            "max_age": "86400",
                        },
                        "routes": routes,
                    }
                ],
            },
            "http_filters": [
                {
                    "name": "envoy.filters.http.cors",
                    "typed_config": {
                        "@type": "type.googleapis.com/envoy.extensions.filters.http.cors.v3.Cors"
                    },
                },
                {
                    "name": "envoy.filters.http.lua",
                    "typed_config": {
                        "@type": "type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua",
                        "inline_code": self._gateway_lua_filter(),
                    },
                },
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
                    "name": "envoy.filters.http.ext_authz",
                    "typed_config": {
                        "@type": "type.googleapis.com/envoy.extensions.filters.http.ext_authz.v3.ExtAuthz",
                        "transport_api_version": "V3",
                        "failure_mode_allow": False,
                        "http_service": {
                            "server_uri": {
                                "uri": control_plane_origin,
                                "cluster": "longlink-control-plane",
                                "timeout": "5s",
                            },
                            "path_prefix": "/api/gateway/authz",
                            "authorization_request": {
                                "allowed_headers": {
                                    "patterns": [
                                        {"exact": "authorization"},
                                        {"exact": "cookie"},
                                        {"exact": "origin"},
                                        {"exact": "x-requested-with"},
                                    ]
                                },
                                "headers_to_add": [
                                    {
                                        "key": "x-longlink-gateway-secret",
                                        "value": GATEWAY_AUTH_SECRET_PLACEHOLDER,
                                    },
                                    {
                                        "key": "x-longlink-original-method",
                                        "value": "%REQ(:METHOD)%",
                                    },
                                    {
                                        "key": "x-longlink-original-path",
                                        "value": "%REQ(:PATH)%",
                                    },
                                ],
                            },
                            "authorization_response": {
                                "allowed_upstream_headers": {
                                    "patterns": [{"exact": header} for header in GATEWAY_IDENTITY_HEADERS]
                                },
                                "allowed_client_headers": {
                                    "patterns": [
                                        {"exact": "cache-control"},
                                        {"exact": "content-type"},
                                    ]
                                },
                            },
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
                "clusters": [control_plane_cluster, *application_clusters],
            }
        }
        return yaml.safe_dump(config, sort_keys=False)

    def _gateway_lua_filter(self) -> str:
        """Return Lua code that strips spoofable identity headers before authorization."""

        header_lines = "\n".join(
            f'    request_headers:remove("{header}")' for header in GATEWAY_IDENTITY_HEADERS
        )
        return f"""function envoy_on_request(request_handle)
    local request_headers = request_handle:headers()
{header_lines}
end
"""

    def _gateway_manifests(self, envoy_config: str) -> list[dict[str, Any]]:
        """Return Kubernetes manifests for the per-cluster Envoy gateway."""

        config_hash = hashlib.sha256(envoy_config.encode("utf-8")).hexdigest()
        gateway_scheme = "HTTPS" if self._gateway_uses_tls() else "HTTP"
        volume_mounts: list[dict[str, Any]] = [
            {"name": "config", "mountPath": GATEWAY_CONFIG_MOUNT_PATH},
            {"name": "tmp", "mountPath": "/tmp"},
        ]
        volumes: list[dict[str, Any]] = [
            {"name": "template", "configMap": {"name": GATEWAY_CONFIG_NAME}},
            {"name": "config", "emptyDir": {}},
            {"name": "tmp", "emptyDir": {}},
        ]
        tls_manifest: dict[str, Any] | None = None
        if self._gateway_uses_tls():
            tls_manifest = {
                "apiVersion": "v1",
                "kind": "Secret",
                "metadata": {
                    "name": GATEWAY_TLS_SECRET_NAME,
                    "namespace": GATEWAY_NAMESPACE,
                    "labels": {"managed-by": "longlink", "app": GATEWAY_NAME},
                },
                "type": "kubernetes.io/tls",
                "data": {
                    "tls.crt": base64.b64encode(
                        (self._gateway_tls_certificate or "").encode("utf-8")
                    ).decode("ascii"),
                    "tls.key": base64.b64encode((self._gateway_tls_key or "").encode("utf-8")).decode("ascii"),
                },
            }
            volume_mounts.append(
                {"name": "tls", "mountPath": GATEWAY_TLS_MOUNT_PATH, "readOnly": True}
            )
            volumes.append({"name": "tls", "secret": {"secretName": GATEWAY_TLS_SECRET_NAME}})

        use_development_ingress = env.DEVELOPMENT and not self._gateway_uses_tls()
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
        if not use_development_ingress and self._gateway_load_balancer_ip is not None and self._gateway_load_balancer_ip.strip():
            service_spec["loadBalancerIP"] = self._gateway_load_balancer_ip.strip()

        manifests = [
            {
                "apiVersion": "v1",
                "kind": "Secret",
                "metadata": {
                    "name": GATEWAY_AUTH_SECRET_NAME,
                    "namespace": GATEWAY_NAMESPACE,
                    "labels": {"managed-by": "longlink", "app": GATEWAY_NAME},
                },
                "type": "Opaque",
                "data": {
                    "gateway-secret": base64.b64encode(self._proxy_secret.encode("utf-8")).decode("ascii")
                },
            },
            {
                "apiVersion": "v1",
                "kind": "ConfigMap",
                "metadata": {
                    "name": GATEWAY_CONFIG_NAME,
                    "namespace": GATEWAY_NAMESPACE,
                    "labels": {"managed-by": "longlink", "app": GATEWAY_NAME},
                },
                "data": {"envoy.yaml": envoy_config},
            },
            {
                "apiVersion": "apps/v1",
                "kind": "Deployment",
                "metadata": {
                    "name": GATEWAY_NAME,
                    "namespace": GATEWAY_NAMESPACE,
                    "labels": {"managed-by": "longlink", "app": GATEWAY_NAME},
                },
                "spec": {
                    "replicas": 2,
                    "selector": {"matchLabels": {"app": GATEWAY_NAME}},
                    "template": {
                        "metadata": {
                            "annotations": {"longlink.io/config-hash": config_hash},
                            "labels": {"managed-by": "longlink", "app": GATEWAY_NAME},
                        },
                        "spec": {
                            "automountServiceAccountToken": False,
                            "securityContext": {
                                "runAsNonRoot": True,
                                "runAsUser": 101,
                                "runAsGroup": 101,
                                "fsGroup": 101,
                                "seccompProfile": {"type": "RuntimeDefault"},
                            },
                            "initContainers": [
                                {
                                    "name": "render-config",
                                    "image": GATEWAY_CONFIG_RENDER_IMAGE,
                                    "command": [
                                        "sh",
                                        "-c",
                                        f"sed 's|{GATEWAY_AUTH_SECRET_PLACEHOLDER}|'\"$LONG_LINK_GATEWAY_SECRET\"'|g' "
                                        f"{GATEWAY_TEMPLATE_MOUNT_PATH}/envoy.yaml > "
                                        f"{GATEWAY_CONFIG_MOUNT_PATH}/envoy.yaml",
                                    ],
                                    "env": [
                                        {
                                            "name": "LONG_LINK_GATEWAY_SECRET",
                                            "valueFrom": {
                                                "secretKeyRef": {
                                                    "name": GATEWAY_AUTH_SECRET_NAME,
                                                    "key": "gateway-secret",
                                                }
                                            },
                                        }
                                    ],
                                    "volumeMounts": [
                                        {
                                            "name": "template",
                                            "mountPath": GATEWAY_TEMPLATE_MOUNT_PATH,
                                            "readOnly": True,
                                        },
                                        {"name": "config", "mountPath": GATEWAY_CONFIG_MOUNT_PATH},
                                    ],
                                    "securityContext": {
                                        "allowPrivilegeEscalation": False,
                                        "capabilities": {"drop": ["ALL"]},
                                        "readOnlyRootFilesystem": True,
                                    },
                                }
                            ],
                            "containers": [
                                {
                                    "name": GATEWAY_NAME,
                                    "image": GATEWAY_IMAGE,
                                    "args": ["-c", f"{GATEWAY_CONFIG_MOUNT_PATH}/envoy.yaml"],
                                    "ports": [
                                        {
                                            "name": "gateway",
                                            "containerPort": GATEWAY_CONTAINER_PORT,
                                        },
                                        {
                                            "name": "admin",
                                            "containerPort": GATEWAY_ADMIN_CONTAINER_PORT,
                                        },
                                    ],
                                    "readinessProbe": {
                                        "httpGet": {
                                            "path": "/ready",
                                            "port": "gateway",
                                            "scheme": gateway_scheme,
                                        },
                                        "periodSeconds": 5,
                                        "failureThreshold": 3,
                                    },
                                    "livenessProbe": {
                                        "httpGet": {
                                            "path": "/ready",
                                            "port": "gateway",
                                            "scheme": gateway_scheme,
                                        },
                                        "periodSeconds": 10,
                                        "failureThreshold": 3,
                                    },
                                    "volumeMounts": volume_mounts,
                                    "resources": {
                                        "requests": {"cpu": "100m", "memory": "128Mi"},
                                        "limits": {"cpu": "500m", "memory": "256Mi"},
                                    },
                                    "securityContext": {
                                        "allowPrivilegeEscalation": False,
                                        "capabilities": {"drop": ["ALL"]},
                                        "readOnlyRootFilesystem": True,
                                    },
                                }
                            ],
                            "volumes": volumes,
                        },
                    },
                },
            },
            {
                "apiVersion": "v1",
                "kind": "Service",
                "metadata": {
                    "name": GATEWAY_NAME,
                    "namespace": GATEWAY_NAMESPACE,
                    "labels": {"managed-by": "longlink", "app": GATEWAY_NAME},
                },
                "spec": service_spec,
            },
            {
                "apiVersion": "networking.k8s.io/v1",
                "kind": "NetworkPolicy",
                "metadata": {
                    "name": "longlink-gateway-ingress",
                    "namespace": GATEWAY_NAMESPACE,
                    "labels": {"managed-by": "longlink", "app": GATEWAY_NAME},
                },
                "spec": {
                    "podSelector": {"matchLabels": {"app": GATEWAY_NAME}},
                    "policyTypes": ["Ingress"],
                    "ingress": [
                        {
                            "ports": [
                                {
                                    "protocol": "TCP",
                                    "port": GATEWAY_CONTAINER_PORT,
                                }
                            ]
                        }
                    ]
                },
            },
        ]
        if tls_manifest is not None:
            manifests.insert(1, tls_manifest)

        if use_development_ingress:
            manifests.append(
                {
                    "apiVersion": "networking.k8s.io/v1",
                    "kind": "Ingress",
                    "metadata": {
                        "name": GATEWAY_NAME,
                        "namespace": GATEWAY_NAMESPACE,
                        "labels": {"managed-by": "longlink", "app": GATEWAY_NAME},
                        "annotations": {
                            "traefik.ingress.kubernetes.io/router.entrypoints": "web,websecure"
                        },
                    },
                    "spec": {
                        "rules": [
                            {
                                "http": {
                                    "paths": [
                                        {
                                            "path": "/api/applications",
                                            "pathType": "Prefix",
                                            "backend": {
                                                "service": {
                                                    "name": GATEWAY_NAME,
                                                    "port": {"number": gateway_service_port},
                                                }
                                            },
                                        },
                                        {
                                            "path": "/ready",
                                            "pathType": "Exact",
                                            "backend": {
                                                "service": {
                                                    "name": GATEWAY_NAME,
                                                    "port": {"number": gateway_service_port},
                                                }
                                            },
                                        },
                                    ]
                                }
                            }
                        ]
                    },
                }
            )

        return manifests

    def _sync_gateway(self) -> None:
        """Apply the current Envoy gateway configuration and restart pods when it changes."""

        self._ensure_gateway_namespace()
        envoy_config = self._gateway_config()
        for manifest in self._gateway_manifests(envoy_config):
            kind = manifest["kind"]
            if kind == "Secret":
                self._upsert(
                    self._core_api.create_namespaced_secret,
                    self._core_api.patch_namespaced_secret,
                    GATEWAY_NAMESPACE,
                    manifest["metadata"]["name"],
                    manifest,
                )
                continue

            if kind == "ConfigMap":
                self._upsert(
                    self._core_api.create_namespaced_config_map,
                    self._core_api.patch_namespaced_config_map,
                    GATEWAY_NAMESPACE,
                    manifest["metadata"]["name"],
                    manifest,
                )
                continue

            if kind == "Deployment":
                self._upsert(
                    self._apps_api.create_namespaced_deployment,
                    self._apps_api.patch_namespaced_deployment,
                    GATEWAY_NAMESPACE,
                    manifest["metadata"]["name"],
                    manifest,
                )
                continue

            if kind == "Service":
                try:
                    self._core_api.patch_namespaced_service(manifest["metadata"]["name"], GATEWAY_NAMESPACE, manifest)
                except ApiException as exc:
                    if exc.status == 404:
                        self._core_api.create_namespaced_service(GATEWAY_NAMESPACE, manifest)
                        continue

                    if not env.DEVELOPMENT:
                        raise ValueError(f"Failed updating Service '{manifest['metadata']['name']}'") from exc

                    # Development may switch the local gateway between direct LoadBalancer and Traefik Ingress modes.
                    self._core_api.delete_namespaced_service(manifest["metadata"]["name"], GATEWAY_NAMESPACE)
                    self._core_api.create_namespaced_service(GATEWAY_NAMESPACE, manifest)

                continue

            if kind == "NetworkPolicy":
                self._upsert(
                    self._networking_api.create_namespaced_network_policy,
                    self._networking_api.patch_namespaced_network_policy,
                    GATEWAY_NAMESPACE,
                    manifest["metadata"]["name"],
                    manifest,
                )
                continue

            if kind == "Ingress":
                self._upsert(
                    self._networking_api.create_namespaced_ingress,
                    self._networking_api.patch_namespaced_ingress,
                    GATEWAY_NAMESPACE,
                    manifest["metadata"]["name"],
                    manifest,
                )
                continue

    def application_pods(self, organization: str, application: str) -> list[client.V1Pod]:
        """Return pods for one managed application."""

        return self._pods(organization, application)

    def application_deployment_ready(self, organization: str, application: str) -> bool:
        """Return whether the current application Deployment rollout is ready."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")
        deployment = self._apps_api.read_namespaced_deployment(name, namespace)
        metadata = deployment.metadata
        spec = deployment.spec
        status = deployment.status
        if metadata is None or spec is None or status is None:
            return False

        expected_replicas = spec.replicas or 1
        if status.observed_generation is None or metadata.generation is None:
            return False

        if status.observed_generation < metadata.generation:
            return False

        unavailable_replicas = status.unavailable_replicas or 0
        return (
            unavailable_replicas == 0
            and status.updated_replicas == expected_replicas
            and status.ready_replicas == expected_replicas
            and status.available_replicas == expected_replicas
        )

    async def namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

        namespace = k8name(names.knames(organization, "Organization"))
        # Reuse the namespace when it already exists so setup stays idempotent.
        try:
            existing_namespace = self._core_api.read_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed reading namespace '{namespace}'") from exc

            self._core_api.create_namespace(
                {
                    "apiVersion": "v1",
                    "kind": "Namespace",
                    "metadata": {"name": namespace, "labels": {"managed-by": "longlink"}},
                }
            )
            self._apply_application_network_policy(namespace)
            return None

        self._validate_managed_namespace(namespace, existing_namespace)
        self._apply_application_network_policy(namespace)

    async def application(
        self,
        organization: str,
        application: str,
        application_id: str,
        image: str,
        port: int,
        secrets: dict[str, str],
        rollout_token: str = "",
    ) -> str:
        """Create or replace one internal application Deployment and Service."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")

        # Replace the full Secret data map so removed environment keys do not survive a merge patch.
        secret_body: dict[str, Any] = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": name,
                "namespace": namespace,
                "labels": {
                    "managed-by": "longlink",
                    "compute-role": "application",
                    "app": name,
                    APPLICATION_ID_LABEL: application_id,
                },
            },
            "type": "Opaque",
            "data": {
                key: base64.b64encode(value.encode("utf-8")).decode("ascii") for key, value in secrets.items()
            },
        }
        try:
            existing_secret = self._core_api.read_namespaced_secret(name, namespace)
            if existing_secret.metadata is None or existing_secret.metadata.resource_version is None:
                raise ValueError(f"Secret '{namespace}/{name}' has no resource version")

            secret_body["metadata"]["resourceVersion"] = existing_secret.metadata.resource_version
            self._core_api.replace_namespaced_secret(name, namespace, secret_body)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed replacing Secret '{namespace}/{name}'") from exc

            self._core_api.create_namespaced_secret(namespace, secret_body)

        application_manifests = templates.readyml(
            TEMPLATES / "application.yml",
            image=image,
            name=name,
            namespace=namespace,
            port=port,
            application_id=application_id,
            rollout_token=rollout_token,
        )
        application_manifests = (
            application_manifests if isinstance(application_manifests, list) else [application_manifests]
        )

        # Apply each manifest by kind so deployments and services use the right Kubernetes client.
        for manifest in application_manifests:
            if manifest["kind"] == "Deployment":
                self._upsert(
                    self._apps_api.create_namespaced_deployment,
                    self._apps_api.patch_namespaced_deployment,
                    namespace,
                    name,
                    manifest,
                )
                continue

            if manifest["kind"] == "Service":
                self._upsert(
                    self._core_api.create_namespaced_service,
                    self._core_api.patch_namespaced_service,
                    namespace,
                    name,
                    manifest,
                )

        self._sync_gateway()
        return f"/{namespace}/{name}/"

    async def delete_application(self, organization: str, application: str) -> None:
        """Delete one managed application workload and tolerate missing resources."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")

        delete_calls = (
            (self._apps_api.delete_namespaced_deployment, "Deployment"),
            (self._core_api.delete_namespaced_service, "Service"),
            (self._core_api.delete_namespaced_secret, "Secret"),
        )
        for delete_call, kind in delete_calls:
            try:
                delete_call(name, namespace)
            except ApiException as exc:
                if exc.status != 404:
                    raise ValueError(f"Failed deleting {kind} '{namespace}/{name}'") from exc

        self._sync_gateway()

    async def delete_namespace(self, organization: str) -> None:
        """Delete one managed organization namespace and tolerate missing namespaces."""

        namespace = k8name(names.knames(organization, "Organization"))
        try:
            existing_namespace = self._core_api.read_namespace(namespace)
        except ApiException as exc:
            if exc.status == 404:
                return None

            raise ValueError(f"Failed reading namespace '{namespace}'") from exc

        self._validate_managed_namespace(namespace, existing_namespace)

        try:
            self._core_api.delete_namespace(namespace)
        except ApiException as exc:
            if exc.status != 404:
                raise ValueError(f"Failed deleting namespace '{namespace}'") from exc

        self._sync_gateway()

    async def logs(self, organization: str, application: str, lines: int = 200) -> str:
        """Return recent logs for one managed application."""

        namespace = k8name(names.knames(organization, "Organization"))
        name = names.knames(application, "Application name")
        pods = self._pods(organization, application)
        if not pods:
            raise ValueError(f"No pods found for application '{namespace}/{name}'")

        def pod_creation_time(item: client.V1Pod) -> datetime:
            """Return a pod creation timestamp with a deterministic fallback."""

            metadata = item.metadata
            if metadata is None or metadata.creation_timestamp is None:
                return datetime.min.replace(tzinfo=UTC)

            return metadata.creation_timestamp

        # Pick the newest pod so logs stay aligned with the latest rollout.
        pod = max(pods, key=pod_creation_time)
        pod_metadata = pod.metadata
        if pod_metadata is None or pod_metadata.name is None:
            raise ValueError(f"No named pods found for application '{namespace}/{name}'")

        pod_status = pod.status
        restart_count = sum(
            container.restart_count or 0
            for container in (pod_status.container_statuses if pod_status is not None else []) or []
        )
        previous_logs = ""
        if restart_count > 0:
            try:
                previous_logs = self._core_api.read_namespaced_pod_log(
                    pod_metadata.name,
                    namespace,
                    tail_lines=lines,
                    previous=True,
                )
            except ApiException as exc:
                if exc.status not in {400, 404}:
                    raise ValueError(f"Failed reading previous logs for '{namespace}/{name}'") from exc

        # Convert Kubernetes API failures into a simple adapter error.
        try:
            current_logs = self._core_api.read_namespaced_pod_log(
                pod_metadata.name,
                namespace,
                tail_lines=lines,
            )
        except ApiException as exc:
            raise ValueError(f"Failed reading logs for '{namespace}/{name}'") from exc

        if previous_logs.strip() and current_logs.strip():
            return f"Previous container logs:\n{previous_logs.rstrip()}\n\nCurrent container logs:\n{current_logs}"

        return previous_logs or current_logs

    async def namespaces(self) -> list[str]:
        """List all namespaces managed by the control plane."""

        return [
            ns.metadata.name
            for ns in self._core_api.list_namespace(label_selector="managed-by=longlink").items
            if ns.metadata.name != GATEWAY_NAMESPACE
        ]

    async def resources(self) -> dict[str, int | float]:
        """Return total and allocatable cluster resources."""

        nodes = self._core_api.list_node().items
        total_ram = 0
        total_cpu = 0.0
        allocatable_ram = 0
        allocatable_cpu = 0.0

        for node in nodes:
            capacity = node.status.capacity or {}
            allocatable = node.status.allocatable or {}
            total_ram += int(parse_quantity(capacity.get("memory", "0")))
            total_cpu += float(parse_quantity(capacity.get("cpu", "0")))
            allocatable_ram += int(parse_quantity(allocatable.get("memory", "0")))
            allocatable_cpu += float(parse_quantity(allocatable.get("cpu", "0")))

        return {
            "ram_total": total_ram,
            "ram_free": allocatable_ram,
            "cpu_total": total_cpu,
            "cpu_free": allocatable_cpu,
        }

    async def pods(self, namespace: str) -> list[dict[str, object]]:
        """List all pods in a namespace."""

        # Fetch actual usage from the metrics API when available.
        metrics_by_pod: dict[str, dict[str, int | float]] = {}
        try:
            custom_api = client.CustomObjectsApi(self._api_client)
            pod_metrics = custom_api.list_namespaced_custom_object("metrics.k8s.io", "v1beta1", namespace, "pods")
            for item in pod_metrics.get("items", []):
                cpu_usage = 0.0
                ram_usage = 0
                for container in item.get("containers", []):
                    usage = container.get("usage", {})
                    cpu_usage += float(parse_quantity(usage.get("cpu", "0")))
                    ram_usage += int(parse_quantity(usage.get("memory", "0")))
                metrics_by_pod[item["metadata"]["name"]] = {
                    "cpu_usage": cpu_usage,
                    "ram_usage": ram_usage,
                }
        except ApiException as exc:
            logger.info("Kubernetes metrics API unavailable for namespace '%s': %s", namespace, exc)

        def pod_resources(pod: Any) -> dict[str, int | float]:
            """Return resource limits and observed usage for one pod."""

            cpu_limit = 0.0
            ram_limit = 0
            for container in pod.spec.containers or []:
                resources = container.resources
                if resources:
                    limits = resources.limits or {}
                    cpu_limit += float(parse_quantity(limits.get("cpu", "0")))
                    ram_limit += int(parse_quantity(limits.get("memory", "0")))
            usage = metrics_by_pod.get(pod.metadata.name, {})
            return {
                "cpu_limit": cpu_limit,
                "ram_limit": ram_limit,
                "cpu_usage": usage.get("cpu_usage", 0.0),
                "ram_usage": usage.get("ram_usage", 0),
            }

        return [
            {
                "name": pod.metadata.name,
                "status": pod.status.phase,
                "node": pod.spec.node_name,
                "created_at": (
                    pod.metadata.creation_timestamp.isoformat() if pod.metadata.creation_timestamp else None
                ),
                "resources": pod_resources(pod),
            }
            for pod in self._core_api.list_namespaced_pod(namespace).items
        ]
