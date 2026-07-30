from . import computes, applications, organizations
from collections.abc import Callable, Awaitable
from src.models.operations import OperationKind
from src.database.models.operations import Operation

OperationHandler = Callable[[Operation], Awaitable[str | None]]

handlers: dict[OperationKind, OperationHandler] = {
    OperationKind.compute_reconcile: computes.reconcile,
    OperationKind.application_create: applications.create,
    OperationKind.application_delete: applications.delete,
    OperationKind.organization_create: organizations.reconcile,
    OperationKind.organization_delete: organizations.delete,
}
