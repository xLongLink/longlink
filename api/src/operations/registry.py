from collections.abc import Callable, Awaitable
from src.models.operations import OperationKind
from src.database.models.operations import Operation

OperationHandler = Callable[[Operation], Awaitable[Operation]]

_handlers: dict[tuple[OperationKind, str], OperationHandler] = {}


def operation_handler(kind: OperationKind, step: str) -> Callable[[OperationHandler], OperationHandler]:
    """Register one operation handler for a kind and step."""

    def decorator(handler: OperationHandler) -> OperationHandler:
        """Store the handler under its operation kind and step."""

        _handlers[(kind, step)] = handler
        return handler

    return decorator


def get_operation_handler(kind: OperationKind, step: str) -> OperationHandler | None:
    """Return the registered handler for one operation kind and step."""

    return _handlers.get((kind, step))
