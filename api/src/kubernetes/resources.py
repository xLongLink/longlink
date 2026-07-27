import json
import kr8s
import yaml
import base64
from typing import TypeVar
from kr8s.asyncio import Api
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

    async def merge_patch(
        self,
        resource_class: type[KubernetesResource],
        name: str,
        body: KubernetesDocument,
        namespace: str | None = None,
    ) -> KubernetesResource:
        """Merge a partial document into one existing Kubernetes resource."""

        # Patch only the named resource fields without changing server-side apply ownership.
        api = await self.api()
        resource_namespace = namespace if resource_class.namespaced else None
        async with api.call_api(
            "PATCH",
            version=resource_class.version,
            url=f"{resource_class.endpoint}/{name}",
            namespace=resource_namespace,
            headers={"Content-Type": "application/merge-patch+json"},
            content=json.dumps(body),
        ) as response:
            return resource_class(response.json(), api=api)

    async def replace_secret(self, body: KubernetesDocument) -> Secret:
        """Create or replace one exact Secret while avoiding unchanged writes."""

        # Resolve the exact Secret identity before reading its current state.
        api = await self.api()
        resource = object_from_spec(body, api=api)
        if not isinstance(resource, Secret):
            raise ValueError("Secret replacement requires a v1 Secret resource")
        existing = await self.read(Secret, resource.name, resource.namespace)
        metadata = body.get("metadata")
        if not isinstance(metadata, dict):
            raise ValueError("Secret replacement requires metadata")
        replacement = {**body, "metadata": dict(metadata)}

        # Create a missing Secret without a preceding failed update.
        if existing is None:
            return await self.create_secret(replacement)

        # Compare the exact LongLink-owned data and metadata while ignoring server fields.
        data = body.get("data", {})
        string_data = body.get("stringData", {})
        if not isinstance(data, dict) or not isinstance(string_data, dict):
            raise ValueError("Secret data must be mappings")
        if not all(isinstance(key, str) and isinstance(value, str) for key, value in data.items()) or not all(
            isinstance(key, str) and isinstance(value, str) for key, value in string_data.items()
        ):
            raise ValueError("Secret data must contain string keys and values")
        desired_data = {key: value for key, value in data.items() if isinstance(key, str) and isinstance(value, str)}
        desired_data.update(
            {
                key: base64.b64encode(value.encode("utf-8")).decode("ascii")
                for key, value in string_data.items()
                if isinstance(key, str) and isinstance(value, str)
            }
        )
        existing_metadata = existing.raw["metadata"]
        if (
            existing.raw.get("data", {}) == desired_data
            and existing.raw.get("type", "Opaque") == body.get("type", "Opaque")
            and all(
                existing_metadata.get(field, empty) == metadata.get(field, empty)
                for field, empty in (("annotations", {}), ("finalizers", []), ("labels", {}))
            )
        ):
            return existing

        # Replace changed content conditionally against the object that was just read.
        replacement["metadata"]["resourceVersion"] = existing_metadata["resourceVersion"]
        async with api.call_api(
            "PUT",
            version=Secret.version,
            url=f"{Secret.endpoint}/{resource.name}",
            namespace=resource.namespace,
            content=json.dumps(replacement),
        ) as response:
            return Secret(response.json(), api=api)

    async def create_secret(self, body: KubernetesDocument) -> Secret:
        """Create one Secret without reading or replacing an existing value."""

        # Resolve and constrain the supplied resource before issuing the create request.
        api = await self.api()
        resource = object_from_spec(body, api=api)
        if not isinstance(resource, Secret):
            raise ValueError("Secret creation requires a v1 Secret resource")

        # Existing Secret state belongs to the lifecycle that created it and must not be overwritten.
        async with api.call_api(
            "POST",
            version=Secret.version,
            url=Secret.endpoint,
            namespace=resource.namespace,
            content=json.dumps(body),
        ) as response:
            return Secret(response.json(), api=api)

    async def read(self, resource_class: type[KubernetesResource], name: str, namespace: str | None = None) -> KubernetesResource | None:
        """Read one resource, returning none when Kubernetes reports it missing."""

        api = await self.api()
        resource_namespace = namespace if resource_class.namespaced else None

        # Normalize only missing resources into the lifecycle's absent state.
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
        resource_namespace = namespace if resource_class.namespaced else None

        # Materialize and narrow the asynchronous resource stream for lifecycle callers.
        resources: list[KubernetesResource] = []
        async for resource in resource_class.list(api=api, namespace=resource_namespace, label_selector=label_selector):
            if not isinstance(resource, resource_class):
                raise TypeError(f"Kubernetes returned an invalid {resource_class.kind} resource")
            resources.append(resource)
        return resources

    async def delete(self, resource_class: type[APIObject], name: str, namespace: str | None = None) -> None:
        """Delete one named resource, treating absence as complete."""

        api = await self.api()
        resource_namespace = namespace if resource_class.namespaced else None

        # Repeated lifecycle attempts may observe an already deleted resource.
        try:
            async with api.call_api(
                "DELETE",
                version=resource_class.version,
                url=f"{resource_class.endpoint}/{name}",
                namespace=resource_namespace,
            ):
                return
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:
            if not isinstance(exc, kr8s.NotFoundError) and getattr(getattr(exc, "response", None), "status_code", None) != 404:
                raise
