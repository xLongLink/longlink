from src.operations import execute
from src.operations import registry
from src.models.operations import OperationKind
from src.database.models.operations import Operation


async def test_operation_handler_decorator_registers_and_dispatches_handler() -> None:
    """Register one custom handler and execute it through the dispatcher."""

    # Arrange
    kind = OperationKind.application_create
    step = "custom_step"

    @registry.operation_handler(kind, step)
    async def fake_handler(operation: Operation) -> Operation:
        """Return the operation unchanged for dispatch verification."""

        return operation

    operation = Operation(kind=kind, step=step, lease_token="test-lease")

    # Act
    handler = registry.get_operation_handler(kind, step)
    result = await execute(operation)

    # Assert
    assert handler is fake_handler
    assert result is operation
