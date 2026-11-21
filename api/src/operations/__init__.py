from uuid import UUID
from src.operations import solutions, organizations
from collections.abc import Callable, Awaitable
from src.models.operations import OperationKind
from src.database.models.operations import Operation

handlers: dict[OperationKind, Callable[[UUID], Awaitable[None]] | Callable[[Operation], Awaitable[None]]] = {
    OperationKind.solution_deploy: solutions.deploy,
    OperationKind.solution_delete: solutions.delete,
    OperationKind.organization_create: organizations.reconcile,
    OperationKind.organization_delete: organizations.delete,
}
