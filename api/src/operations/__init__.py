from . import computes, applications, organizations
from uuid import UUID
from collections.abc import Callable, Awaitable
from src.models.operations import OperationKind

handlers: dict[OperationKind, Callable[[UUID], Awaitable[str | None]]] = {
    OperationKind.compute_create: computes.create,
    OperationKind.application_create: applications.create,
    OperationKind.application_delete: applications.delete,
    OperationKind.organization_create: organizations.reconcile,
    OperationKind.organization_delete: organizations.delete,
}
