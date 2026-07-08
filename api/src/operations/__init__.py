from fastapi import HTTPException
from src.logger import logger
from src.operations import registry
from src.database.models.operations import Operation
from src.database.services import operations


async def execute(operation: Operation) -> Operation:
    """Execute one claimed operation step and persist the next state."""

    # Claimed operations must carry the lease token needed for state transitions.
    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    # Dispatch the handler and convert raised errors into persisted operation failures.
    try:

        # Import the built-in handlers lazily so package imports stay free of cycles.
        from src.operations.implementation import applications as _applications  # noqa: F401

        # Dispatch the operation to the registered handler for its kind and step.
        handler = registry.get_operation_handler(operation.kind, operation.step)

        # Unsupported operation rows are terminal worker errors.
        if handler is None:
            raise ValueError(f"Unsupported operation '{operation.kind}' step '{operation.step}'")

        logger.info("Running operation %s (%s/%s)", operation.id, operation.kind, operation.step)
        return await handler(operation)

    # Persist handler failures on the operation row before returning control to the worker.
    except Exception as exc:
        detail = str(exc.detail) if isinstance(exc, HTTPException) else str(exc)

        # HTTP errors are expected domain failures, while other exceptions need a traceback.
        if isinstance(exc, HTTPException):
            logger.warning("Operation %s failed: %s", operation.id, detail)

        # Unexpected operation failures need tracebacks for debugging.
        else:
            logger.exception("Operation %s failed", operation.id)

        failed = await operations.fail(operation.id, detail, operation.lease_token)

        # Return the persisted failure row when this worker still owns the lease.
        if failed is not None:
            return failed

        raise
