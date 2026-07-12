from src.operations import registry
from src.models.operations import OperationKind
from src.operations.implementation import applications, organizations


def test_operation_handlers_are_registered_by_decorator() -> None:
    """Register operation handlers through route-style implementation modules."""

    # Importing the implementation modules runs the decorators and fills the registry.
    assert registry.handlers[OperationKind.application_remove] is applications.remove
    assert registry.handlers[OperationKind.application_verify] is applications.verify
    assert registry.handlers[OperationKind.organization_remove] is organizations.remove
