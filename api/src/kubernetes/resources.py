import json
import kr8s
import yaml
import base64
from typing import TypeVar
from kr8s.asyncio import Api
from collections.abc import Mapping
from kr8s.asyncio.objects import Secret, APIObject, Deployment, object_from_spec

KubernetesDocument = dict[str, object]
KubernetesResource = TypeVar("KubernetesResource", bound=APIObject)


def deployment_is_ready(deployment: Deployment) -> bool:
    """Return whether every replica belongs to the observed Deployment generation."""

    # Require the controller to observe this generation and make every desired replica available.
    generation = deployment.metadata.get("generation")
    replicas = deployment.spec.get("replicas", 1)
    status = deployment.raw.get("status")
    return (
        isinstance(generation, int)
        and isinstance(replicas, int)
        and isinstance(status, dict)
        and status.get("observedGeneration") == generation
        and status.get("updatedReplicas", 0) == replicas
        and status.get("readyReplicas", 0) == replicas
        and status.get("availableReplicas", 0) == replicas
    )


class KubernetesResources:
    """Provide the minimum resource operations for a dedicated LongLink compute cluster."""

    def __init__(self, kubeconfig: str) -> None:
        """Initialize lazy access to one configured cluster."""

        self._kubeconfig = kubeconfig
        self._api_client: Api | None = None

    async def api(self) -> Api:
        """Return the cached kr8s API client for the configured cluster."""

        # Lazily connect so clients that only render manifests open no cluster connection.
        if self._api_client is None:
            kubeconfig = yaml.safe_load(self._kubeconfig)
            if not isinstance(kubeconfig, dict):
                raise ValueError("Kubernetes kubeconfig must be a mapping")

            # kr8s accepts in-memory mappings although its annotation only declares file paths.
            self._api_client = await kr8s.asyncio.api(kubeconfig=kubeconfig, serviceaccount="")

        return self._api_client

    async def apply(self, resource_class: type[KubernetesResource], body: KubernetesDocument) -> KubernetesResource:
        """Server-side apply one resource and return the stored object."""

        # Validate and construct the expected resource before resolving its Kubernetes endpoint.
        api = await self.api()
        resource = object_from_spec(body, api=api)
        if not isinstance(resource, resource_class):
            raise ValueError(f"Expected a {resource_class.kind} manifest, received {resource.kind}")
        namespace = resource.namespace if resource.namespaced else None

        # Force this dedicated cluster toward LongLink's desired resource state.
        async with api.call_api(
            "PATCH",
            version=resource.version,
            url=f"{resource.endpoint}/{resource.name}",
            namespace=namespace,
            params={"fieldManager": "longlink-platform", "force": "true"},
            headers={"Content-Type": "application/apply-patch+yaml"},
            content=yaml.safe_dump(body),
        ) as response:
            return resource_class(response.json(), api=api)

    async def patch(
        self,
        resource_class: type[KubernetesResource],
        name: str,
        body: KubernetesDocument,
        namespace: str | None = None,
    ) -> None:
        """Merge a partial document into one existing Kubernetes resource."""

        # Patch only the named resource fields without changing server-side apply ownership.
        api = await self.api()
        resource = resource_class(name, namespace=namespace if resource_class.namespaced else None, api=api)
        await resource.patch(body)

    async def replace_secret(self, name: str, namespace: str, values: Mapping[str, str], secret_type: str = "Opaque") -> Secret:
        """Create or replace one exact Secret while avoiding unchanged writes."""

        # Resolve the exact Secret identity and normalized data before creating a missing value.
        api = await self.api()
        desired_data = {key: base64.b64encode(value.encode("utf-8")).decode("ascii") for key, value in values.items()}
        existing = await self.read(Secret, name, namespace)
        if existing is None:
            return await self.create_secret(name, namespace, values, secret_type)

        # Compare the exact LongLink-owned data and metadata while ignoring server fields.
        existing_metadata = existing.raw["metadata"]
        if (
            existing.raw.get("data", {}) == desired_data
            and existing.raw.get("type", "Opaque") == secret_type
            and all(
                existing_metadata.get(field, empty) == empty
                for field, empty in (("annotations", {}), ("finalizers", []), ("labels", {}))
            )
        ):
            return existing

        # Replace changed content conditionally against the object that was just read.
        replacement = {
            "apiVersion": "v1",
            "kind": "Secret",
            "metadata": {
                "name": name,
                "namespace": namespace,
                "resourceVersion": existing_metadata["resourceVersion"],
            },
            "type": secret_type,
            "stringData": dict(values),
        }
        async with api.call_api(
            "PUT",
            version=Secret.version,
            url=f"{Secret.endpoint}/{name}",
            namespace=namespace,
            content=json.dumps(replacement),
        ) as response:
            return Secret(response.json(), api=api)

    async def create_secret(self, name: str, namespace: str, values: Mapping[str, str], secret_type: str = "Opaque") -> Secret:
        """Create one Secret without reading or replacing an existing value."""

        # Construct the exact typed Secret at the resource boundary.
        api = await self.api()
        resource = Secret(
            {
                "metadata": {"name": name, "namespace": namespace},
                "stringData": dict(values),
                "type": secret_type,
            },
            api=api,
        )

        # Existing Secret state belongs to the lifecycle that created it and must not be overwritten.
        await resource.create()
        return resource

    async def read(self, resource_class: type[KubernetesResource], name: str, namespace: str | None = None) -> KubernetesResource | None:
        """Read one resource, returning none when Kubernetes reports it missing."""

        # Construct the named typed resource against the configured API.
        api = await self.api()
        resource = resource_class(name, namespace=namespace if resource_class.namespaced else None, api=api)

        # Normalize only missing resources into the lifecycle's absent state.
        try:
            await resource.refresh()
        except kr8s.NotFoundError:
            return None
        return resource

    async def list(
        self,
        resource_class: type[KubernetesResource],
        namespace: str | None = None,
        label_selector: dict[str, str] | None = None,
    ) -> list[KubernetesResource]:
        """List resources through an explicit kr8s resource class."""

        api = await self.api()

        # Materialize and narrow the asynchronous resource stream for lifecycle callers.
        resources: list[KubernetesResource] = []
        async for resource in resource_class.list(
            api=api,
            namespace=namespace if resource_class.namespaced else None,
            label_selector=label_selector,
        ):
            if not isinstance(resource, resource_class):
                raise TypeError(f"Kubernetes returned an invalid {resource_class.kind} resource")
            resources.append(resource)
        return resources

    async def delete(self, resource_class: type[APIObject], name: str, namespace: str | None = None) -> None:
        """Delete one named resource, treating absence as complete."""

        # Construct the named typed resource against the configured API.
        api = await self.api()
        resource = resource_class(name, namespace=namespace if resource_class.namespaced else None, api=api)

        # Repeated lifecycle attempts may observe an already deleted resource.
        try:
            await resource.delete()
        except kr8s.NotFoundError:
            pass
