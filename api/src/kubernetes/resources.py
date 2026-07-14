import json
import kr8s
import yaml
from typing import Any, TypeVar
from kr8s.asyncio import Api
from kr8s.asyncio.objects import APIObject, object_from_spec

KubernetesResource = TypeVar("KubernetesResource", bound=APIObject)


class KubernetesResources:
    """Provide shared low-level resource operations for one Kubernetes cluster."""

    def __init__(self, kubeconfig: str) -> None:
        """Initialize lazy access to one configured cluster."""

        self._kubeconfig = kubeconfig
        self._api_client: Api | None = None

    async def api(self) -> Api:
        """Return the cached kr8s API client for the configured cluster."""

        # Lazily connect so clients that only hold registry metadata open no cluster connection.
        if self._api_client is None:
            kubeconfig = yaml.safe_load(self._kubeconfig)
            if not isinstance(kubeconfig, dict):
                raise ValueError("Kubernetes kubeconfig must be a mapping")

            # kr8s accepts in-memory mappings although its public factory annotation only declares file paths.
            self._api_client = await kr8s.asyncio.api(**{"kubeconfig": kubeconfig, "serviceaccount": ""})

        return self._api_client

    async def read(self, resource_class: type[KubernetesResource], name: str, namespace: str | None = None) -> KubernetesResource | None:
        """Read one resource, returning none when Kubernetes reports it missing."""

        api = await self.api()
        resource_namespace = namespace if resource_class.namespaced else None

        # Call the API endpoint directly to avoid discovery calls and normalize only missing resources.
        try:
            async with api.call_api(
                "GET",
                version=resource_class.version,
                url=f"{resource_class.endpoint}/{name}",
                namespace=resource_namespace,
            ) as response:
                return resource_class(response.json(), api=api)
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:
            if isinstance(exc, kr8s.NotFoundError) or getattr(getattr(exc, "response", None), "status_code", None) == 404:
                return None
            raise

    async def list(
        self,
        resource_class: type[KubernetesResource],
        namespace: str | None = None,
        label_selector: dict[str, str] | None = None,
    ) -> list[KubernetesResource]:
        """List resources through an explicit kr8s resource class."""

        api = await self.api()

        # Materialize and narrow the async resource stream so callers receive typed objects.
        resources: list[KubernetesResource] = []
        async for resource in resource_class.list(api=api, namespace=namespace, label_selector=label_selector):
            if not isinstance(resource, resource_class):
                raise TypeError(f"Kubernetes returned an invalid {resource_class.kind} resource")
            resources.append(resource)
        return resources

    async def upsert(self, body: dict[str, Any]) -> None:
        """Create a resource when missing, otherwise patch the live object."""

        resource = object_from_spec(body, api=await self.api())

        # Patch existing resources and create only when Kubernetes reports a miss.
        try:
            await resource.patch(body)
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:
            if not isinstance(exc, kr8s.NotFoundError) and getattr(getattr(exc, "response", None), "status_code", None) != 404:
                raise
            await resource.create()

    async def replace(self, body: dict[str, Any]) -> None:
        """Replace one resource body, creating it when it does not exist."""

        resource = object_from_spec(body, api=await self.api())
        resource_class = type(resource)
        namespace = resource.namespace if resource.namespaced else None
        existing = await self.read(resource_class, resource.name, namespace)

        # Create missing resources instead of issuing a replace without a resource version.
        if existing is None:
            await resource.create()
            return

        body["metadata"]["resourceVersion"] = existing.metadata.resourceVersion

        # Use PUT so omitted fields are removed from resources such as Secrets.
        api = await self.api()
        async with api.call_api(
            "PUT",
            version=resource_class.version,
            url=f"{resource_class.endpoint}/{resource.name}",
            namespace=namespace,
            content=json.dumps(body),
        ):
            return None

    async def delete(self, resource_class: type[APIObject], name: str, namespace: str | None = None) -> None:
        """Delete one resource and tolerate missing objects."""

        body: dict[str, Any] = {"metadata": {"name": name}}

        # Namespaced resource objects need their namespace in the deletion body.
        if resource_class.namespaced:
            body["metadata"]["namespace"] = namespace

        # Missing resources are already deleted from the caller perspective.
        try:
            await resource_class(body, api=await self.api()).delete()
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:
            if not isinstance(exc, kr8s.NotFoundError) and getattr(getattr(exc, "response", None), "status_code", None) != 404:
                raise
