import json
import yaml
import base64
import hashlib
from typing import Any, TypeVar, cast
from .library import Pod, Secret, Service, APIObject, Namespace, Deployment, kr8s, object_from_spec
from src.utils import names, templates
from src.constants import ROOT
from src.environments import env

KubernetesResource = TypeVar("KubernetesResource", bound=APIObject)


class Kubernetes:
    """Manage Kubernetes namespaces, workloads, gateway routing, and inspection."""

    def __init__(self, kubeconfig: str, proxy_secret: str) -> None:
        """Initialize the Kubernetes compute client."""

        self._kubeconfig = kubeconfig
        self._proxy_secret = proxy_secret
        self._api_client: Any | None = None

    async def _client(self) -> Any:
        """Return the cached kr8s API client for the configured cluster."""

        # Lazily create the Kubernetes client so unused registries do not open connections.
        if self._api_client is None:
            kubeconfig = yaml.safe_load(self._kubeconfig)

            # A registry kubeconfig must be authoritative; do not fall back to the API pod service account.
            self._api_client = await kr8s.asyncio.api(kubeconfig=cast(Any, kubeconfig), serviceaccount=cast(Any, False))

        return self._api_client

    async def _resource(self, body: dict[str, Any]) -> APIObject:
        """Return one kr8s resource object for a Kubernetes manifest body."""

        # Convert unsupported manifest kinds into a caller-facing validation error.
        try:
            return object_from_spec(body, api=await self._client())
        except KeyError as exc:
            raise ValueError(f"Unsupported Kubernetes resource kind '{body['kind']}'") from exc

    def _not_found(self, exc: Exception) -> bool:
        """Return whether a kr8s exception represents a missing resource."""

        # kr8s may expose missing resources as a typed error.
        if isinstance(exc, kr8s.NotFoundError):
            return True

        response = getattr(exc, "response", None)
        return getattr(response, "status_code", None) == 404

    async def _read(self, resource_class: type[KubernetesResource], name: str, namespace: str | None = None) -> KubernetesResource:
        """Read one Kubernetes resource without discovery or retry delay."""

        api = await self._client()
        resource_namespace = namespace if resource_class.namespaced else None

        # Call the API endpoint directly to avoid extra discovery calls and retry waits.
        async with api.call_api(
            "GET",
            version=resource_class.version,
            url=f"{resource_class.endpoint}/{name}",
            namespace=resource_namespace,
        ) as response:
            return resource_class(response.json(), api=api)

    async def _list(
        self,
        resource_class: type[KubernetesResource],
        namespace: str | None = None,
        label_selector: dict[str, str] | None = None,
    ) -> list[KubernetesResource]:
        """List Kubernetes resources through an explicit kr8s resource class."""

        api = await self._client()

        # Materialize the async resource stream so callers receive a normal list.
        return [
            cast(KubernetesResource, resource)
            async for resource in resource_class.list(
                api=api,
                namespace=namespace,
                label_selector=label_selector,
            )
        ]

    async def _upsert(self, body: dict[str, Any]) -> None:
        """Create a resource when missing, otherwise patch the live object."""

        resource = await self._resource(body)

        # Prefer patching existing resources and fall back to create only for missing objects.
        try:
            await resource.patch(body)
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:

            # Non-404 failures should surface as update failures.
            if not self._not_found(exc):
                raise ValueError(f"Failed updating {body['kind']} '{resource.name}'") from exc

            await resource.create()

    async def _replace(self, body: dict[str, Any]) -> None:
        """Replace one resource body, creating it when it does not exist."""

        resource = await self._resource(body)
        resource_class = type(resource)
        namespace = resource.namespace if resource.namespaced else None
        api = await self._client()

        # Read the live resource so the replace request can include its resource version.
        try:
            existing = await self._read(resource_class, resource.name, namespace)
        except kr8s.ServerError as exc:

            # Create missing resources instead of issuing a replace with no resource version.
            if not self._not_found(exc):
                raise ValueError(f"Failed reading {body['kind']} '{resource.name}'") from exc

            await resource.create()
            return None

        body["metadata"]["resourceVersion"] = existing.metadata.resourceVersion

        # Use PUT so omitted fields are removed from resources such as Secrets.
        async with api.call_api(
            "PUT",
            version=resource_class.version,
            url=f"{resource_class.endpoint}/{resource.name}",
            namespace=namespace,
            content=json.dumps(body),
        ):
            return None

    async def _delete(self, resource_class: type[APIObject], name: str, namespace: str | None = None) -> None:
        """Delete one resource and tolerate missing objects."""

        body: dict[str, Any] = {"metadata": {"name": name}}

        # Namespaced resource objects need their namespace in the deletion body.
        if resource_class.namespaced:
            body["metadata"]["namespace"] = namespace

        # Missing resources are already deleted from the caller perspective.
        try:
            await resource_class(body, api=await self._client()).delete()
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:

            # Preserve unexpected Kubernetes failures for the higher-level adapter.
            if not self._not_found(exc):
                raise

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
            "name": "x-longlink-gateway-secret",
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
        manifests = templates.readyml_list(ROOT / "kubernetes" / "templates" / "gateway.yml", **template_context)

        # Development needs an Ingress resource because the local gateway service stays ClusterIP.
        if use_development_ingress:
            ingress_manifests = templates.readyml_list(
                ROOT / "kubernetes" / "templates" / "gateway_development_ingress.yml",
                **template_context,
            )
            manifests.extend(ingress_manifests)

        return manifests

    async def sync_gateway(self) -> None:
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

    async def namespace(self, organization: str) -> None:
        """Create the namespace for an organization if it does not exist."""

        namespace = names.knames(organization)
        policy = {
            "apiVersion": "networking.k8s.io/v1",
            "kind": "NetworkPolicy",
            "metadata": {
                "name": "longlink-gateway-ingress",
                "namespace": namespace,
            },
            "spec": {
                "podSelector": {"matchLabels": {"compute-role": "application"}},
                "policyTypes": ["Ingress"],
                "ingress": [
                    {
                        "from": [
                            {
                                "namespaceSelector": {"matchLabels": {"kubernetes.io/metadata.name": "longlink-system"}},
                                "podSelector": {"matchLabels": {"app": "longlink-gateway"}},
                            }
                        ]
                    }
                ],
            },
        }

        # Reuse an existing namespace or create it when Kubernetes reports it missing.
        try:
            await self._read(Namespace, namespace)

        # Handle namespace read failures by checking whether Kubernetes reported a miss.
        except kr8s.ServerError as exc:

            # Non-404 failures indicate Kubernetes could not confirm namespace state.
            if not self._not_found(exc):
                raise ValueError(f"Failed reading namespace '{namespace}'") from exc

            resource = await self._resource(
                {"apiVersion": "v1", "kind": "Namespace", "metadata": {"name": namespace}}
            )
            await resource.create()

        await self._upsert(policy)

    async def delete_namespace(self, organization: str) -> None:
        """Delete one managed organization namespace and tolerate missing namespaces."""

        namespace = names.knames(organization)

        # Read the namespace first so missing namespaces can be treated as already deleted.
        try:
            await self._read(Namespace, namespace)

        # Handle namespace lookup failures before attempting deletion.
        except kr8s.ServerError as exc:

            # Missing namespaces are already deleted from the cluster perspective.
            if self._not_found(exc):
                return None

            raise ValueError(f"Failed reading namespace '{namespace}'") from exc

        # Delete the namespace after Kubernetes confirms it exists.
        try:
            await self._delete(Namespace, namespace)

        # Report Kubernetes delete failures with namespace context.
        except kr8s.ServerError as exc:
            raise ValueError(f"Failed deleting namespace '{namespace}'") from exc

        await self.sync_gateway()

    async def namespaces(self) -> list[str]:
        """List all organization namespaces in the connected cluster."""

        # Dedicated compute clusters reserve Kubernetes system namespaces for platform infrastructure.
        return [ns.name for ns in await self._list(Namespace) if ns.name not in names.KUBERNETES_SYSTEM_NAMESPACES]

    async def pods(self, namespace: str) -> list[dict[str, object]]:
        """List all pods in a namespace."""

        pods = await self._list(Pod, namespace)

        # Return only the pod fields currently shown in the compute UI.
        return [
            {
                "name": pod.name,
                "status": pod.raw.get("status", {}).get("phase"),
                "node": pod.raw.get("spec", {}).get("nodeName"),
            }
            for pod in pods
        ]

    async def pod(self, application_id: str) -> APIObject | None:
        """Return the pod for one managed application."""

        # Application UUIDs are globally unique, so pod lookup can span organization namespaces.
        try:
            pods = await self._list(Pod, kr8s.ALL, {"longlink.io/application-id": application_id})
        except kr8s.ServerError as exc:
            raise RuntimeError("Failed reading application pod") from exc

        # Applications run as single-pod workloads, but the pod may not exist yet during startup.
        return pods[0] if pods else None

    async def ready(self, application_id: str) -> bool:
        """Return whether the current application Deployment rollout is ready."""

        # Application UUIDs are globally unique, so deployment lookup can span organization namespaces.
        try:
            deployments = await self._list(Deployment, kr8s.ALL, {"longlink.io/application-id": application_id})
        except kr8s.ServerError as exc:
            raise RuntimeError("Failed reading application deployment") from exc

        # The Deployment may not exist yet during initial startup.
        if not deployments:
            return False

        # Missing deployment status means Kubernetes has not reported readiness yet.
        deployment = deployments[0]
        if deployment.metadata is None or deployment.status is None:
            return False

        observed_generation = deployment.status.get("observedGeneration")
        generation = deployment.metadata.get("generation")

        return (
            generation is not None
            and observed_generation is not None
            and observed_generation >= generation
            and deployment.status.get("updatedReplicas") == 1
            and deployment.status.get("readyReplicas") == 1
        )

    async def create(self, organization: str, application_id: str, image: str, secrets: dict[str, str]) -> str:
        """Create or replace one internal application Deployment and Service."""

        namespace = names.knames(organization)

        # Replace the full Secret data map so removed environment keys do not survive a merge patch.
        secret_body: dict[str, Any] = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": application_id,
                "namespace": namespace,
                "labels": {
                    "compute-role": "application",
                    "app": application_id,
                    "longlink.io/application-id": application_id,
                },
            },
            "type": "Opaque",
            "data": {
                key: base64.b64encode(value.encode("utf-8")).decode("ascii") for key, value in secrets.items()
            },
        }
        await self._replace(secret_body)

        application_manifests = templates.readyml_list(
            ROOT / "kubernetes" / "templates" / "application.yml",
            image=image,
            namespace=namespace,
            application_id=application_id,
        )

        # Apply Deployment and Service manifests after the runtime Secret exists.
        for manifest in application_manifests:
            await self._upsert(manifest)

        await self.sync_gateway()
        return f"/{namespace}/{application_id}/"

    async def delete(self, application_id: str) -> None:
        """Delete one managed application workload and tolerate missing resources."""

        # Delete all UUID-labeled workload resources across organization namespaces.
        for resource_class in (Deployment, Service, Secret):
            try:
                resources = await self._list(resource_class, kr8s.ALL, {"longlink.io/application-id": application_id})
            except kr8s.ServerError as exc:
                raise ValueError("Failed deleting application resources") from exc

            # Surface Kubernetes deletion failures with resource context.
            for resource in resources:
                try:
                    await cast(Any, resource).delete()
                except (kr8s.NotFoundError, kr8s.ServerError) as exc:
                    if not self._not_found(exc):
                        raise ValueError("Failed deleting application resources") from exc

        await self.sync_gateway()

    async def logs(self, application_id: str, lines: int = 200) -> list[str]:
        """Return recent logs for one managed application."""

        # Read the application pod before streaming logs from it.
        try:
            pod = await self.pod(application_id)
        except RuntimeError as exc:
            raise ValueError("Failed reading application pod") from exc

        # Logs require the single application pod to exist.
        if pod is None:
            raise ValueError("No application pod found")

        # Convert Kubernetes API failures into a simple client-facing adapter error.
        try:
            return [cast(str, line) async for line in cast(Any, pod).logs(tail_lines=lines)]
        except kr8s.ServerError as exc:
            raise ValueError("Failed reading application logs") from exc
