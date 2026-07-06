from fastapi import HTTPException
from src.logger import logger
from src.operations.registry import get_operation_handler
from src.database.models.operations import Operation
from src.database.services import operations


async def execute(operation: Operation) -> Operation:
    """Execute one claimed operation step and persist the next state."""

    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    try:
        # Import the built-in handlers lazily so package imports stay free of cycles.
        from src.operations import applications as _applications  # noqa: F401

        # Dispatch the operation to the registered handler for its kind and step.
        handler = get_operation_handler(operation.kind, operation.step)
        if handler is None:
            raise ValueError(f"Unsupported operation '{operation.kind}' step '{operation.step}'")

        logger.info("Running operation %s (%s/%s)", operation.id, operation.kind, operation.step)
        return await handler(operation)
    except Exception as exc:
        detail = str(exc.detail) if isinstance(exc, HTTPException) else str(exc)
        if isinstance(exc, HTTPException):
            logger.warning("Operation %s failed: %s", operation.id, detail)
        else:
            logger.exception("Operation %s failed", operation.id)

        failed = await operations.fail(operation.id, detail, operation.lease_token)
        if failed is not None:
            return failed

        raise
