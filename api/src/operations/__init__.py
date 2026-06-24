from fastapi import HTTPException
from src.logger import logger
from src.models.operations import OperationKind
from src.operations.applications import execute_application_create, execute_application_delete
from src.database.models.operations import Operation
from src.database.services.operations import operations


async def execute(operation: Operation) -> Operation:
    """Execute one claimed operation step and persist the next state."""

    try:
        # Dispatch each operation kind to its dedicated executor.
        if operation.kind == OperationKind.application_create:
            logger.info("Running application startup verification %s", operation.id)
            return await execute_application_create(operation)

        if operation.kind == OperationKind.application_delete:
            logger.info("Running application deletion %s", operation.id)
            return await execute_application_delete(operation)

        raise ValueError(f"Unsupported operation '{operation.kind}'")
    except Exception as exc:
        detail = str(exc.detail) if isinstance(exc, HTTPException) else str(exc)
        if isinstance(exc, HTTPException):
            logger.warning("Operation %s failed: %s", operation.id, detail)
        else:
            logger.exception("Operation %s failed", operation.id)

        failed = await operations.fail(operation.id, detail)
        if failed is not None:
            return failed

        raise
