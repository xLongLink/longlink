from kr8s.asyncio.objects import APIObject, Deployment


async def apply(resource: APIObject, manifest: dict[str, object]) -> None:
    """Create or patch one Kubernetes resource to its desired manifest."""

    # Patch existing resources to repair drift without recreating their identities.
    if await resource.exists():
        await resource.patch(manifest)
    else:
        await resource.create()


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
        and status.get("replicas") == replicas
        and status.get("updatedReplicas") == replicas
        and status.get("readyReplicas") == replicas
        and status.get("availableReplicas") == replicas
    )
