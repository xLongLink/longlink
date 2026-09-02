from . import computes, solutions, organizations
from uuid import UUID
from collections.abc import Callable, Awaitable
from src.models.operations import OperationKind

handlers: dict[OperationKind, Callable[[UUID], Awaitable[str | None]]] = {
    OperationKind.compute_create: computes.create,
    OperationKind.solution_create: solutions.create,
    OperationKind.solution_delete: solutions.delete,
    OperationKind.organization_create: organizations.reconcile,
    OperationKind.organization_delete: organizations.delete,
}
