import json
import kr8s
import yaml
from typing import Any, TypeVar, cast
from datetime import UTC, datetime
from kr8s.asyncio.objects import APIObject, object_from_spec

KubernetesResource = TypeVar("KubernetesResource", bound=APIObject)


def parse_kubernetes_timestamp(value: object) -> datetime | None:
    """Parse one Kubernetes timestamp value into an aware datetime."""

    if isinstance(value, datetime):
        return value if value.tzinfo is not None else value.replace(tzinfo=UTC)

    if not isinstance(value, str) or not value:
        return None

    timestamp = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(timestamp)
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=UTC)


class KubernetesResources:
    """Provide shared kr8s client and resource operations."""

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
        """Initialize the Kubernetes compute client."""

        self._kubeconfig = kubeconfig
        self._proxy_secret = proxy_secret
        self._ingress_host = ingress_host
        self._gateway_tls_key = gateway_tls_key
        self._gateway_tls_certificate = gateway_tls_certificate
        self._gateway_load_balancer_ip = gateway_load_balancer_ip
        self._api_client: Any | None = None

    async def _client(self) -> Any:
        """Return the cached kr8s API client for the configured cluster."""

        if self._api_client is None:
            kubeconfig = yaml.safe_load(self._kubeconfig)
            # A registry kubeconfig must be authoritative; do not fall back to the API pod service account.
            self._api_client = await kr8s.asyncio.api(kubeconfig=cast(Any, kubeconfig), serviceaccount=cast(Any, False))

        return self._api_client

    async def _resource(self, body: dict[str, Any]) -> APIObject:
        """Return one kr8s resource object for a Kubernetes manifest body."""

        try:
            return object_from_spec(body, api=await self._client())
        except KeyError as exc:
            raise ValueError(f"Unsupported Kubernetes resource kind '{body['kind']}'") from exc

    def _not_found(self, exc: Exception) -> bool:
        """Return whether a kr8s exception represents a missing resource."""

        if isinstance(exc, kr8s.NotFoundError):
            return True

        response = getattr(exc, "response", None)
        return getattr(response, "status_code", None) == 404

    async def _read(
        self,
        resource_class: type[KubernetesResource],
        name: str,
        namespace: str | None = None,
    ) -> KubernetesResource:
        """Read one Kubernetes resource without discovery or retry delay."""

        api = await self._client()
        resource_namespace = namespace if resource_class.namespaced else None
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
        try:
            await resource.patch(body)
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:
            if not self._not_found(exc):
                raise ValueError(f"Failed updating {body['kind']} '{resource.name}'") from exc

            await resource.create()

    async def _replace(self, body: dict[str, Any]) -> None:
        """Replace one resource body, creating it when it does not exist."""

        resource = await self._resource(body)
        resource_class = type(resource)
        namespace = resource.namespace if resource.namespaced else None
        api = await self._client()

        try:
            existing = await self._read(resource_class, resource.name, namespace)
        except kr8s.ServerError as exc:
            if not self._not_found(exc):
                raise ValueError(f"Failed reading {body['kind']} '{resource.name}'") from exc

            await resource.create()
            return None

        body["metadata"]["resourceVersion"] = existing.metadata.resourceVersion
        async with api.call_api(
            "PUT",
            version=resource_class.version,
            url=f"{resource_class.endpoint}/{resource.name}",
            namespace=namespace,
            content=json.dumps(body),
        ):
            return None

    async def _delete(
        self,
        resource_class: type[APIObject],
        name: str,
        namespace: str | None = None,
    ) -> None:
        """Delete one resource and tolerate missing objects."""

        body: dict[str, Any] = {"metadata": {"name": name}}
        if resource_class.namespaced:
            body["metadata"]["namespace"] = namespace

        try:
            await resource_class(body, api=await self._client()).delete()
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:
            if not self._not_found(exc):
                raise

    def _validate_managed_namespace(self, namespace: str, namespace_object: APIObject) -> None:
        """Raise when one namespace is not owned by LongLink."""

        labels = namespace_object.metadata.get("labels", {})
        if labels.get("managed-by") != "longlink":
            raise ValueError(f"Namespace '{namespace}' is not managed by LongLink")
