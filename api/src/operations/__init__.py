from fastapi import HTTPException
from src.logger import logger
from src.operations import registry
from src.database.services import operations
from src.operations.outcomes import OperationOutcome, OperationOutcomeState
from src.database.models.operations import Operation


async def apply_outcome(operation: Operation, outcome: OperationOutcome) -> Operation:
    """Persist one handler outcome through the current operation lease."""

    # Claimed operations must carry the lease token needed for state transitions.
    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    # Complete successful work exactly once while this worker owns the lease.
    if outcome.state == OperationOutcomeState.complete:
        completed = await operations.complete(operation.id, operation.lease_token)
        return completed or operation

    # Release waiting work back to the scheduled queue.
    if outcome.state == OperationOutcomeState.defer:
        deferred = await operations.defer(operation.id, operation.lease_token, outcome.delay_seconds)
        return deferred or operation

    # Persist domain failures with sanitized public error text.
    if outcome.state == OperationOutcomeState.fail:
        failed = await operations.fail(operation.id, outcome.error or "Operation failed", operation.lease_token)
        return failed or operation

    raise ValueError(f"Unsupported operation outcome '{outcome.state}'")


async def execute(operation: Operation) -> Operation:
    """Execute one claimed operation and persist the next state."""

    # Claimed operations must carry the lease token needed for state transitions.
    if operation.lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    # Dispatch the handler and convert raised errors into persisted operation failures.
    try:

        # Import operation modules so their decorators register handlers, mirroring FastAPI route modules.
        from src.operations.implementation import applications as _applications  # noqa: F401
        from src.operations.implementation import organizations as _organizations  # noqa: F401

        # Resolve the operation handler before dispatching the operation.
        handler = registry.get_operation_handler(operation.kind)
        if handler is None:
            raise ValueError(f"Unsupported operation '{operation.kind}'")

        logger.info("Running operation %s (%s)", operation.id, operation.kind)
        outcome = await handler(operation)
        return await apply_outcome(operation, outcome)

    # Persist handler failures on the operation row before returning control to the worker.
    except Exception as exc:
        detail = str(exc.detail) if isinstance(exc, HTTPException) else str(exc)

        # HTTP errors are expected domain failures, while other exceptions need a traceback.
        if isinstance(exc, HTTPException):
            logger.warning("Operation %s failed: %s", operation.id, detail)

        # Unexpected operation failures need tracebacks for debugging.
        else:
            logger.exception("Operation %s failed: %r", operation.id, exc)

        failed = await operations.fail(operation.id, detail, operation.lease_token)

        # Return the persisted failure row when this worker still owns the lease.
        if failed is not None:
            return failed

        raise
