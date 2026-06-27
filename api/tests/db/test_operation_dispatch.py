from src.operations import execute
from src.models.operations import OperationKind
from src.operations.registry import operation_handler, get_operation_handler
from src.database.models.operations import Operation


async def test_operation_handler_decorator_registers_and_dispatches_handler() -> None:
    """Register one custom handler and execute it through the dispatcher."""

    # Arrange
    kind = OperationKind.application_create
    step = "custom_step"

    @operation_handler(kind, step)
    async def fake_handler(operation: Operation) -> Operation:
        """Return the operation unchanged for dispatch verification."""

        return operation

    operation = Operation(kind=kind, step=step)

    # Act
    handler = get_operation_handler(kind, step)
    result = await execute(operation)

    # Assert
    assert handler is fake_handler
    assert result is operation
