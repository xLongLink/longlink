from collections.abc import Callable, Awaitable
from src.models.operations import OperationKind
from src.operations.outcomes import OperationOutcome
from src.database.models.operations import Operation

OperationHandler = Callable[[Operation], Awaitable[OperationOutcome]]

handlers: dict[OperationKind, OperationHandler] = {}


def operation_handler(kind: OperationKind) -> Callable[[OperationHandler], OperationHandler]:
    """Register one operation handler for a kind."""

    def decorator(handler: OperationHandler) -> OperationHandler:
        """Store the handler under its operation kind."""

        # Refuse duplicate handlers so operation routing stays deterministic.
        if kind in handlers:
            raise ValueError(f"Operation handler already registered for '{kind}'")

        handlers[kind] = handler
        return handler

    return decorator
