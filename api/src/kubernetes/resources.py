import json
import kr8s
import yaml
import base64
from copy import deepcopy
from typing import Any, TypeVar
from kr8s.asyncio import Api
from kr8s.asyncio.objects import Secret, APIObject, object_from_spec

KubernetesDocument = dict[str, Any]
KubernetesResource = TypeVar("KubernetesResource", bound=APIObject)

FIELD_MANAGER = "longlink-platform"
MANAGED_BY_LABEL = "app.kubernetes.io/managed-by"
LOCATION_ID_LABEL = "longlink.io/location-id"
LONG_LINK_METADATA_PREFIX = "longlink.io/"
SECRET_REPLACE_ATTEMPTS = 3
SERVER_METADATA_FIELDS = {
    "creationTimestamp",
    "deletionGracePeriodSeconds",
    "deletionTimestamp",
    "generateName",
    "generation",
    "managedFields",
    "resourceVersion",
    "selfLink",
    "uid",
}


def _resource_from_body(body: KubernetesDocument, api: Api) -> APIObject:
    """Validate a manifest and return its matching kr8s API object."""

    # Reject incomplete identities before constructing an endpoint or sending a request.
    api_version = body.get("apiVersion")
    kind = body.get("kind")
    metadata = body.get("metadata")
    if not isinstance(api_version, str) or not api_version:
        raise ValueError("Kubernetes resource apiVersion must be a non-empty string")
    if not isinstance(kind, str) or not kind:
        raise ValueError("Kubernetes resource kind must be a non-empty string")
    if not isinstance(metadata, dict):
        raise ValueError("Kubernetes resource metadata must be a mapping")

    # Every desired resource needs a stable name because apply targets one item endpoint.
    name = metadata.get("name")
    if not isinstance(name, str) or not name:
        raise ValueError("Kubernetes resource metadata.name must be a non-empty string")

    return object_from_spec(body, api=api)


def _comparable_secret(body: KubernetesDocument) -> KubernetesDocument:
    """Return a Secret body without server metadata and with API defaults normalized."""

    # Remove fields assigned by the API server because they are not part of desired state.
    comparable = deepcopy(body)
    comparable.pop("status", None)
    metadata = comparable.get("metadata")
    if not isinstance(metadata, dict):
        raise ValueError("Kubernetes resource metadata must be a mapping")
    for field in SERVER_METADATA_FIELDS:
        metadata.pop(field, None)

    # Empty metadata collections are equivalent to fields omitted by the API server.
    if not metadata.get("annotations"):
        metadata.pop("annotations", None)
    if not metadata.get("finalizers"):
        metadata.pop("finalizers", None)
    if not metadata.get("labels"):
        metadata.pop("labels", None)

    # The API stores stringData as base64-encoded data and defaults the Secret type.
    string_data = comparable.pop("stringData", None)
    if string_data is not None:
        if not isinstance(string_data, dict) or not all(
            isinstance(key, str) and isinstance(value, str) for key, value in string_data.items()
        ):
            raise ValueError("Kubernetes Secret stringData must map strings to strings")
        data = comparable.setdefault("data", {})
        if not isinstance(data, dict):
            raise ValueError("Kubernetes Secret data must be a mapping")
        data.update({key: base64.b64encode(value.encode("utf-8")).decode("ascii") for key, value in string_data.items()})
    comparable.setdefault("data", {})
    comparable.setdefault("type", "Opaque")
    return comparable


class KubernetesResources:
    """Provide the low-level cluster boundary for apply, exact Secret replacement, discovery, and conditional deletion.

    Higher layers must establish ownership and canonical identity before mutating discovered resources.
    """

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

    async def apply(self, body: KubernetesDocument) -> APIObject:
        """Server-side apply one resource under LongLink's field manager.

        Apply forces field conflicts, so callers must establish authority over any existing resource first.
        """

        # Resolve the resource class once so its endpoint and scope drive the PATCH request.
        api = await self.api()
        resource = _resource_from_body(body, api)
        namespace = resource.namespace if resource.namespaced else None

        # Server-side apply creates or updates the desired object in one API request.
        async with api.call_api(
            "PATCH",
            version=resource.version,
            url=f"{resource.endpoint}/{resource.name}",
            namespace=namespace,
            params={"fieldManager": FIELD_MANAGER, "force": "true"},
            headers={"Content-Type": "application/apply-patch+yaml"},
            content=yaml.safe_dump(body),
        ) as response:
            document: Any = response.json()
            if not isinstance(document, dict):
                raise TypeError("Kubernetes apply response must be a mapping")
            return type(resource)(document, api=api)

    async def replace_secret(self, body: KubernetesDocument) -> Secret:
        """Create or replace a Secret with authoritative data, so omitted keys are removed rather than retained by field ownership.

        Preserve existing labels plus non-LongLink annotations and finalizers, allowing desired labels to override matching keys. Retry
        resource-version conflicts from a fresh read.
        """

        # Validate the body and resolve the namespace before entering the conflict retry loop.
        api = await self.api()
        resource = _resource_from_body(body, api)
        if not isinstance(resource, Secret):
            raise ValueError("Exact replacement only supports v1 Secret resources")
        namespace = resource.namespace

        # A conflicting create or replace is retried from a fresh read a bounded number of times.
        for attempt in range(SECRET_REPLACE_ATTEMPTS):
            try:
                existing = await self.read(Secret, resource.name, namespace)
                replacement = deepcopy(body)
                metadata = replacement["metadata"]
                if namespace is not None:
                    metadata.setdefault("namespace", namespace)

                # A missing Secret can be created directly without a preceding failed write.
                if existing is None:
                    async with api.call_api(
                        "POST",
                        version=Secret.version,
                        url=Secret.endpoint,
                        namespace=namespace,
                        content=json.dumps(replacement),
                    ) as response:
                        document: Any = response.json()
                        if not isinstance(document, dict):
                            raise TypeError("Kubernetes Secret response must be a mapping")
                        return Secret(document, api=api)

                # Keep annotations and finalizers controlled by Kubernetes providers.
                existing_body = existing.to_dict()
                existing_metadata = existing_body.get("metadata", {})
                if not isinstance(existing_metadata, dict):
                    raise TypeError("Kubernetes Secret metadata must be a mapping")
                desired_annotations = metadata.get("annotations", {})
                existing_annotations = existing_metadata.get("annotations", {})
                if not isinstance(desired_annotations, dict) or not isinstance(existing_annotations, dict):
                    raise TypeError("Kubernetes Secret annotations must be mappings")
                annotations = dict(desired_annotations)
                annotations.update(
                    {key: value for key, value in existing_annotations.items() if not key.startswith(LONG_LINK_METADATA_PREFIX)}
                )
                if annotations:
                    metadata["annotations"] = annotations
                else:
                    metadata.pop("annotations", None)

                # Preserve labels added by providers while desired LongLink labels remain authoritative.
                desired_labels = metadata.get("labels", {})
                existing_labels = existing_metadata.get("labels", {})
                if not isinstance(desired_labels, dict) or not isinstance(existing_labels, dict):
                    raise TypeError("Kubernetes Secret labels must be mappings")
                labels = dict(existing_labels)
                labels.update(desired_labels)
                if labels:
                    metadata["labels"] = labels
                else:
                    metadata.pop("labels", None)

                desired_finalizers = metadata.get("finalizers", [])
                existing_finalizers = existing_metadata.get("finalizers", [])
                if not isinstance(desired_finalizers, list) or not all(isinstance(item, str) for item in desired_finalizers):
                    raise TypeError("Kubernetes Secret finalizers must be a list of strings")
                if not isinstance(existing_finalizers, list) or not all(isinstance(item, str) for item in existing_finalizers):
                    raise TypeError("Kubernetes Secret finalizers must be a list of strings")
                finalizers = [item for item in existing_finalizers if not item.startswith(LONG_LINK_METADATA_PREFIX)]
                finalizers.extend(item for item in desired_finalizers if item not in finalizers)
                if finalizers:
                    metadata["finalizers"] = finalizers
                else:
                    metadata.pop("finalizers", None)

                # Avoid a write when the exact desired body is already stored.
                if _comparable_secret(existing_body) == _comparable_secret(replacement):
                    return existing

                # Kubernetes cannot mutate any field on an immutable Secret.
                if existing_body.get("immutable") is True:
                    raise ValueError(f"Immutable Kubernetes Secret {resource.name!r} differs from desired state")

                # Resource versions make the exact replacement conditional on the object just read.
                resource_version = existing_metadata.get("resourceVersion")
                if not isinstance(resource_version, str) or not resource_version:
                    raise TypeError("Kubernetes Secret response did not include metadata.resourceVersion")
                metadata["resourceVersion"] = resource_version
                async with api.call_api(
                    "PUT",
                    version=Secret.version,
                    url=f"{Secret.endpoint}/{resource.name}",
                    namespace=namespace,
                    content=json.dumps(replacement),
                ) as response:
                    document: Any = response.json()
                    if not isinstance(document, dict):
                        raise TypeError("Kubernetes Secret response must be a mapping")
                    return Secret(document, api=api)
            except kr8s.ServerError as exc:
                status_code = getattr(getattr(exc, "response", None), "status_code", None)
                if status_code != 409 or attempt == SECRET_REPLACE_ATTEMPTS - 1:
                    raise

        raise RuntimeError("Kubernetes Secret replacement exhausted conflict retries")

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
                document: Any = response.json()
                if not isinstance(document, dict):
                    raise TypeError("Kubernetes read response must be a mapping")
                return resource_class(document, api=api)
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

        # Materialize and narrow the async resource stream so callers receive typed objects.
        resources: list[KubernetesResource] = []
        async for resource in resource_class.list(api=api, namespace=resource_namespace, label_selector=label_selector):
            if not isinstance(resource, resource_class):
                raise TypeError(f"Kubernetes returned an invalid {resource_class.kind} resource")
            resources.append(resource)
        return resources

    async def list_owned(
        self,
        resource_class: type[KubernetesResource],
        location_id: str,
        namespace: str | None = None,
    ) -> list[KubernetesResource]:
        """List resources only when both LongLink manager and location labels match.

        This selector is the first ownership boundary; callers still validate kind-specific identity before mutation.
        """

        # Both labels are required so another controller's resources cannot be adopted accidentally.
        return await self.list(
            resource_class,
            namespace,
            {
                MANAGED_BY_LABEL: FIELD_MANAGER,
                LOCATION_ID_LABEL: location_id,
            },
        )

    async def delete(
        self,
        resource_class: type[APIObject],
        name: str,
        namespace: str | None = None,
        uid: str | None = None,
    ) -> None:
        """Delete one resource, optionally only when its UID still matches."""

        api = await self.api()
        resource_namespace = namespace if resource_class.namespaced else None
        body: KubernetesDocument = {"apiVersion": "v1", "kind": "DeleteOptions"}

        # A UID precondition prevents deleting a replacement created under the same name.
        if uid is not None:
            body["preconditions"] = {"uid": uid}

        # Missing resources are already deleted from the caller perspective.
        try:
            async with api.call_api(
                "DELETE",
                version=resource_class.version,
                url=f"{resource_class.endpoint}/{name}",
                namespace=resource_namespace,
                content=json.dumps(body),
            ):
                return None
        except (kr8s.NotFoundError, kr8s.ServerError) as exc:
            if not isinstance(exc, kr8s.NotFoundError) and getattr(getattr(exc, "response", None), "status_code", None) != 404:
                raise
