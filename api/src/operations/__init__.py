from fastapi import HTTPException
from src.logger import logger
from src.models.operations import OperationKind
from src.operations.applications import execute_app_create
from src.database.models.operation import Operation
from src.database.services.operations import operations


async def execute(operation: Operation) -> Operation:
    """Execute one claimed operation step and persist the next state."""

    try:
        # Dispatch each operation kind to its dedicated executor.
        if operation.kind == OperationKind.app_create:
            logger.info("Running app startup verification %s", operation.id)
            return await execute_app_create(operation)

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
