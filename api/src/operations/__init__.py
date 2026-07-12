from fastapi import HTTPException
from src.logger import logger
from src.operations import registry
from src.database.services import operations
from src.operations.outcomes import OperationOutcomeState
from src.operations.implementation import applications as _applications  # noqa: F401
from src.operations.implementation import organizations as _organizations  # noqa: F401
from src.database.models.operations import Operation


async def execute(operation: Operation) -> Operation:
    """Run a claimed operation handler and persist its requested outcome.

    Flow:
        endpoint writes domain state
            -> queue operation metadata
            -> worker claims row and receives a lease token
            -> execute dispatches the registered handler
            -> handler returns complete, defer, or fail
            -> execute persists that outcome with the active lease token

    Callers must pass an operation returned by `claim` or `claim_next`. The row carries a lease token that identifies the
    worker currently allowed to mutate it. Completion, deferral, and failure updates all include that token so a stale
    worker cannot overwrite another worker after an expired lease has been reclaimed.
    """

    # Claimed operations must carry the lease token needed for state transitions.
    lease_token = operation.lease_token
    if lease_token is None:
        raise ValueError("Operation must be claimed before execution")

    # Dispatch the handler and convert raised errors into persisted operation failures.
    try:
        # Resolve the operation handler before dispatching the operation.
        handler = registry.handlers.get(operation.kind)
        if handler is None:
            raise ValueError(f"Unsupported operation '{operation.kind}'")

        logger.info("Running operation %s (%s)", operation.id, operation.kind)
        outcome = await handler(operation)

        # Persist the handler outcome exactly once while this worker owns the lease.
        match outcome.state:
            case OperationOutcomeState.complete:
                updated = await operations.complete(operation.id, lease_token)

            case OperationOutcomeState.defer:
                updated = await operations.defer(operation.id, lease_token, outcome.delay)

            case OperationOutcomeState.fail:
                updated = await operations.fail(operation.id, outcome.error or "Operation failed", lease_token)

            case _:
                raise ValueError(f"Unsupported operation outcome '{outcome.state}'")

        return updated or operation

    # Persist handler failures on the operation row before returning control to the worker.
    except Exception as exc:
        detail = str(exc.detail) if isinstance(exc, HTTPException) else str(exc)

        # HTTP errors are expected domain failures, while other exceptions need a traceback.
        if isinstance(exc, HTTPException):
            logger.warning("Operation %s failed: %s", operation.id, detail)

        # Unexpected operation failures need tracebacks for debugging.
        else:
            logger.exception("Operation %s failed: %r", operation.id, exc)

        failed = await operations.fail(operation.id, detail, lease_token)

        # Return the persisted failure row when this worker still owns the lease.
        if failed is not None:
            return failed

        raise
