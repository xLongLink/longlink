from typing import TYPE_CHECKING
from kr8s.asyncio.objects import new_class

if TYPE_CHECKING:
    from src.kubernetes.client import Kubernetes


DEFAULT_CLASS_ANNOTATION = "storageclass.kubernetes.io/is-default-class"
StorageClassResource = new_class("StorageClass", "storage.k8s.io/v1", asyncio=True, plural="storageclasses")


async def resolve(cluster: "Kubernetes") -> str:
    """Return the sole or default StorageClass configured in a Compute cluster."""

    # A single class needs no administrator choice; multiple classes require the Kubernetes default marker.
    classes: list[tuple[str, bool]] = []
    async for storage_class in StorageClassResource.list(api=await cluster.api()):
        name = storage_class.metadata.get("name")
        annotations = storage_class.metadata.get("annotations", {})
        if not isinstance(name, str) or not name:
            raise ValueError("StorageClass must have a name")
        is_default = isinstance(annotations, dict) and annotations.get(DEFAULT_CLASS_ANNOTATION) == "true"
        classes.append((name, is_default))

    if not classes:
        raise ValueError("Compute cluster has no storage classes")
    if len(classes) == 1:
        return classes[0][0]

    defaults = [name for name, is_default in classes if is_default]
    if len(defaults) == 1:
        return defaults[0]
    if len(defaults) > 1:
        raise ValueError("Compute cluster has multiple default storage classes")
    raise ValueError("Compute cluster has multiple storage classes without a default")
