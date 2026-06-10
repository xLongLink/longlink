from src.logger import logger
from src.database.models.operation import Operation
from src.database.services.compute import compute
from src.database.services.operations import operations


async def execute_compute_setup(operation: Operation) -> Operation:
    """Provision one compute registry and finalize its setup operation."""

    payload = operation.payload or {}
    logger.info("Running compute setup %s", operation.id)
    registry = await compute.get(int(payload["registry_id"]))
    if registry is None:
        raise ValueError(f"Compute registry '{payload['registry_id']}' not found")

    from src.adapters.compute import K8s

    k8s = K8s(registry.kubeconfig, registry.proxy_secret)
    try:
        await k8s.cleanup()
        await k8s.setup()
    except Exception as exc:
        logger.warning("Compute setup %s could not reach the cluster: %s", operation.id, exc)
        failed = await operations.fail(operation.id, str(exc))
        if failed is not None:
            return failed

        return operation

    ready = await operations.ready(operation.id)
    if ready is None:
        return operation

    completed = await operations.complete(operation.id)
    if completed is not None:
        logger.info("Completed compute setup %s", operation.id)
        return completed

    return ready
