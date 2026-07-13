from src.utils import jobs
from src.operations import applications, organizations
from src.models.operations import OperationKind


def test_operation_handlers_are_registered_by_decorator() -> None:
    """Register operation handlers through route-style implementation modules."""

    # Importing the implementation modules runs the decorators and fills the registry.
    assert jobs.handlers[OperationKind.application_remove] is applications.remove
    assert jobs.handlers[OperationKind.application_create] is applications.create
    assert jobs.handlers[OperationKind.organization_remove] is organizations.remove
