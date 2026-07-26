import json
import kr8s
import time
import yaml
import base64
import asyncio
import builtins
from copy import deepcopy
from typing import Any, TypeVar
from kr8s.asyncio import Api
from kr8s.asyncio.objects import Pod, Secret, APIObject, Deployment, object_from_spec

KubernetesDocument = dict[str, Any]
KubernetesResource = TypeVar("KubernetesResource", bound=APIObject)

FIELD_MANAGER = "longlink-platform"
MANAGED_BY_LABEL = "app.kubernetes.io/managed-by"
COMPUTE_ID_LABEL = "longlink.io/compute-id"
RESOURCE_SCOPE_LABEL = "longlink.io/resource-scope"
LONG_LINK_METADATA_PREFIX = "longlink.io/"
SECRET_REPLACE_ATTEMPTS = 3
RESOURCE_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2
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


def metadata(resource: APIObject) -> dict[str, Any]:
    """Return validated Kubernetes object metadata at the external document boundary."""

    body: Any = resource.to_dict()
    if not isinstance(body, dict):
        raise TypeError(f"Kubernetes {resource.kind} response must be a mapping")
    value = body.get("metadata")
    if not isinstance(value, dict):
        raise TypeError(f"Kubernetes {resource.kind} response must include metadata")
    return value


def string_map(value: dict[str, Any], field: str) -> dict[str, str]:
    """Return one validated string metadata mapping from a Kubernetes response."""

    items = value.get(field, {})
    if not isinstance(items, dict) or not all(isinstance(key, str) and isinstance(item, str) for key, item in items.items()):
        raise TypeError(f"Kubernetes metadata.{field} must map strings to strings")
    return items


def uid(resource: APIObject) -> str:
    """Return the UID required for a conditional deletion."""

    value = metadata(resource).get("uid")
    if not isinstance(value, str) or not value:
        raise TypeError(f"Kubernetes {resource.kind} response did not include metadata.uid")
    return value


def resource_version(resource: APIObject) -> str:
    """Return the resource version used to trigger a dependent workload rollout."""

    value = metadata(resource).get("resourceVersion")
    if not isinstance(value, str) or not value:
        raise TypeError(f"Kubernetes {resource.kind} response did not include metadata.resourceVersion")
    return value


def pod_is_active(pod: Pod) -> bool:
    """Return whether one Pod can still start or execute Application code."""

    body: Any = pod.to_dict()
    status = body.get("status") if isinstance(body, dict) else None
    phase = status.get("phase") if isinstance(status, dict) else None
    return phase not in {"Succeeded", "Failed"}


def set_pod_annotation(body: KubernetesDocument, name: str, value: str) -> None:
    """Set one validated pod-template annotation on a desired Deployment."""

    # Deployment templates are internal manifests, but validate their shape before mutation.
    spec = body.get("spec")
    template = spec.get("template") if isinstance(spec, dict) else None
    template_metadata = template.get("metadata") if isinstance(template, dict) else None
    if not isinstance(template_metadata, dict):
        raise TypeError("Desired Deployment must include spec.template.metadata")
    annotations = template_metadata.setdefault("annotations", {})
    if not isinstance(annotations, dict):
        raise TypeError("Desired Deployment pod annotations must be a mapping")
    annotations[name] = value


def _named_items(document: dict[str, Any], field: str) -> dict[str, dict[str, Any]]:
    """Return one pod-spec list indexed by required unique item names."""

    items = document.get(field, [])
    if not isinstance(items, list):
        raise TypeError(f"Kubernetes pod spec {field} must be a list")
    indexed: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict) or not isinstance(item.get("name"), str):
            raise TypeError(f"Kubernetes pod spec {field} entries must have names")
        indexed[item["name"]] = item
    return indexed


def _deployment_shape_matches(desired: KubernetesDocument, actual: APIObject) -> bool:
    """Return whether security-critical pod lists exactly match the desired Deployment shape."""

    actual_body: Any = actual.to_dict()
    desired_spec = desired.get("spec")
    actual_spec = actual_body.get("spec") if isinstance(actual_body, dict) else None
    desired_template = desired_spec.get("template") if isinstance(desired_spec, dict) else None
    actual_template = actual_spec.get("template") if isinstance(actual_spec, dict) else None
    desired_pod = desired_template.get("spec") if isinstance(desired_template, dict) else None
    actual_pod = actual_template.get("spec") if isinstance(actual_template, dict) else None
    if not isinstance(desired_pod, dict) or not isinstance(actual_pod, dict):
        return False
    for field in ("containers", "initContainers", "volumes"):
        desired_items = _named_items(desired_pod, field)
        actual_items = _named_items(actual_pod, field)
        if desired_items.keys() != actual_items.keys():
            return False
        if field == "volumes":
            continue
        for name, desired_container in desired_items.items():
            actual_container = actual_items[name]
            for list_field in ("env", "envFrom", "ports", "volumeMounts"):
                desired_list = desired_container.get(list_field, [])
                actual_list = actual_container.get(list_field, [])
                if not isinstance(desired_list, list) or not isinstance(actual_list, list):
                    return False
                if list_field == "env":
                    desired_values = sorted(
                        (item.get("name"), item.get("value"), json.dumps(item.get("valueFrom"), sort_keys=True))
                        for item in desired_list
                        if isinstance(item, dict)
                    )
                    actual_values = sorted(
                        (item.get("name"), item.get("value"), json.dumps(item.get("valueFrom"), sort_keys=True))
                        for item in actual_list
                        if isinstance(item, dict)
                    )
                elif list_field == "envFrom":
                    desired_values = sorted(json.dumps(item, sort_keys=True) for item in desired_list)
                    actual_values = sorted(json.dumps(item, sort_keys=True) for item in actual_list)
                elif list_field == "ports":
                    desired_values = sorted(
                        (item.get("name"), item.get("containerPort")) for item in desired_list if isinstance(item, dict)
                    )
                    actual_values = sorted((item.get("name"), item.get("containerPort")) for item in actual_list if isinstance(item, dict))
                else:
                    desired_values = sorted((item.get("name"), item.get("mountPath")) for item in desired_list if isinstance(item, dict))
                    actual_values = sorted((item.get("name"), item.get("mountPath")) for item in actual_list if isinstance(item, dict))
                if desired_values != actual_values or len(desired_values) != len(desired_list) or len(actual_values) != len(actual_list):
                    return False
    return True


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


def _platform_ownership(body: KubernetesDocument) -> dict[str, str]:
    """Return the complete ownership labels required from one Platform resource."""

    metadata = body.get("metadata")
    labels = metadata.get("labels") if isinstance(metadata, dict) else None
    if not isinstance(labels, dict):
        raise ValueError("Desired Kubernetes resource metadata.labels must be a mapping")
    if labels.get(MANAGED_BY_LABEL) != FIELD_MANAGER:
        raise ValueError("Desired Platform resource has invalid ownership labels")
    if labels.get(RESOURCE_SCOPE_LABEL) != "platform":
        raise ValueError("Desired Platform resource has invalid ownership scope")
    compute_id = labels.get(COMPUTE_ID_LABEL)
    if not isinstance(compute_id, str) or not compute_id:
        raise ValueError("Desired Platform resource has invalid compute ownership")
    return {
        MANAGED_BY_LABEL: FIELD_MANAGER,
        COMPUTE_ID_LABEL: compute_id,
        RESOURCE_SCOPE_LABEL: "platform",
    }


def _validate_existing_ownership(resource: APIObject, expected: dict[str, str]) -> None:
    """Reject an existing resource outside the exact desired LongLink ownership boundary."""

    body: Any = resource.to_dict()
    metadata = body.get("metadata") if isinstance(body, dict) else None
    labels = metadata.get("labels") if isinstance(metadata, dict) else None
    if isinstance(labels, dict) and all(labels.get(key) == value for key, value in expected.items()):
        return
    raise ValueError(
        f"Kubernetes {resource.kind} {resource.name!r} is not owned by compute "
        f"{expected[COMPUTE_ID_LABEL]} in {expected[RESOURCE_SCOPE_LABEL]} scope"
    )


class KubernetesResources:
    """Provide Platform ownership checks and explicit Application resource lifecycle access."""

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
            self._api_client = await kr8s.asyncio.api(
                kubeconfig=kubeconfig,
                serviceaccount="",
            )

        return self._api_client

    async def apply_platform(self, body: KubernetesDocument) -> APIObject:
        """Validate Platform ownership and server-side apply one resource."""

        return await self._apply(body, _platform_ownership(body))

    async def apply_application(self, body: KubernetesDocument) -> APIObject:
        """Server-side apply one exact Application lifecycle resource."""

        return await self._apply(body)

    async def _apply(self, body: KubernetesDocument, expected: dict[str, str] | None = None) -> APIObject:
        """Server-side apply one validated resource with optional ownership enforcement."""

        # Resolve the desired resource before forced apply can claim fields on an existing object.
        api = await self.api()
        resource = _resource_from_body(body, api)
        namespace = resource.namespace if resource.namespaced else None
        if expected is not None:
            existing = await self.read(type(resource), resource.name, namespace)
            if existing is not None:
                _validate_existing_ownership(existing, expected)

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

    async def apply_platform_deployment(self, body: KubernetesDocument) -> Deployment:
        """Apply one Platform Deployment with ownership and exact pod-list enforcement."""

        return await self._apply_deployment(body, _platform_ownership(body))

    async def apply_application_deployment(self, body: KubernetesDocument) -> Deployment:
        """Apply one Application Deployment with exact pod-list enforcement."""

        return await self._apply_deployment(body)

    async def _apply_deployment(self, body: KubernetesDocument, expected: dict[str, str] | None = None) -> Deployment:
        """Apply one Deployment and recreate it when foreign pod-list entries survive."""

        # Apply the requested Deployment and verify its security-critical list shape.
        applied = await self._apply(body, expected)
        if not isinstance(applied, Deployment):
            raise TypeError("Kubernetes Deployment apply returned an unexpected resource kind")
        if _deployment_shape_matches(body, applied):
            return applied

        # Recreate exclusively owned Deployments so injected list entries cannot survive lifecycle deployment.
        await self.delete(Deployment, applied.name, applied.namespace, uid(applied))
        deadline = time.monotonic() + RESOURCE_TIMEOUT_SECONDS
        while await self.read(Deployment, applied.name, applied.namespace) is not None:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Kubernetes Deployment {applied.name!r} did not terminate before recreation")
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
        recreated = await self._apply(body, expected)
        if not isinstance(recreated, Deployment) or not _deployment_shape_matches(body, recreated):
            raise RuntimeError(f"Kubernetes Deployment {applied.name!r} retained unexpected pod entries")
        return recreated

    async def replace_platform_secret(self, body: KubernetesDocument) -> Secret:
        """Create or replace one exact Platform Secret after validating ownership."""

        return await self._replace_secret(body, _platform_ownership(body))

    async def replace_application_secret(self, body: KubernetesDocument) -> Secret:
        """Create or replace one exact Application Secret."""

        return await self._replace_secret(body)

    async def _replace_secret(self, body: KubernetesDocument, expected: dict[str, str] | None = None) -> Secret:
        """Create or replace a Secret with authoritative data, so omitted keys are removed rather than retained by field ownership.

        Preserve provider labels, annotations, and finalizers while retrying resource-version conflicts from a fresh read.
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

                # Every Platform retry revalidates ownership before exact replacement can change labels or data.
                if expected is not None:
                    _validate_existing_ownership(existing, expected)

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

                # Preserve provider labels while removing omitted LongLink labels.
                desired_labels = metadata.get("labels", {})
                existing_labels = existing_metadata.get("labels", {})
                if not isinstance(desired_labels, dict) or not isinstance(existing_labels, dict):
                    raise TypeError("Kubernetes Secret labels must be mappings")
                labels = {key: value for key, value in existing_labels.items() if not key.startswith(LONG_LINK_METADATA_PREFIX)}
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

    async def list_platform_owned(
        self, resource_class: type[KubernetesResource], compute_id: str, namespace: str | None = None
    ) -> builtins.list[KubernetesResource]:
        """List resources owned by one LongLink Platform compute target."""

        # Platform selection includes the compute claim and excludes Application resources.
        return await self.list(
            resource_class,
            namespace,
            {
                MANAGED_BY_LABEL: FIELD_MANAGER,
                COMPUTE_ID_LABEL: compute_id,
                RESOURCE_SCOPE_LABEL: "platform",
            },
        )

    async def read_platform_owned(
        self,
        resource_class: type[KubernetesResource],
        name: str,
        compute_id: str,
        namespace: str | None = None,
    ) -> KubernetesResource | None:
        """Read one exact resource owned by a LongLink Platform compute target."""

        # Keep the exact lookup and ownership check in one security boundary.
        resource = await self.read(resource_class, name, namespace)
        if resource is None:
            return None

        _validate_existing_ownership(
            resource,
            {
                MANAGED_BY_LABEL: FIELD_MANAGER,
                COMPUTE_ID_LABEL: compute_id,
                RESOURCE_SCOPE_LABEL: "platform",
            },
        )
        return resource

    async def read_application(
        self,
        resource_class: type[KubernetesResource],
        name: str,
        namespace: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> KubernetesResource | None:
        """Read one exact Application resource and validate optional identity labels."""

        # Keep the exact lookup and identity check in one lifecycle boundary.
        resource = await self.read(resource_class, name, namespace)
        if resource is None:
            return None

        if labels is not None:
            existing_labels = string_map(metadata(resource), "labels")
            if any(existing_labels.get(key) != value for key, value in labels.items()):
                raise ValueError(f"Kubernetes {resource.kind} {resource.name!r} has invalid lifecycle identity labels")
        return resource

    async def delete_application(
        self,
        resource_class: type[KubernetesResource],
        name: str,
        namespace: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> None:
        """Delete one exact Application resource by UID, treating absence as complete."""

        # Validate current identity immediately before the conditional deletion.
        resource = await self.read_application(resource_class, name, namespace, labels)
        if resource is None:
            return
        await self.delete(resource_class, name, namespace, uid(resource))

    async def delete(self, resource_class: type[APIObject], name: str, namespace: str | None = None, uid: str | None = None) -> None:
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
