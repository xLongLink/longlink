from uuid import UUID
from contextlib import contextmanager
from sqlalchemy import event
from contextvars import ContextVar
from sqlalchemy.orm import Session as SyncSession
from collections.abc import Iterator
from longlink.utils.time import utcnow
from src.database.models.base import AuditTable, TombstoneAuditTable

_current_actor: ContextVar[UUID | None] = ContextVar("current_actor", default=None)


@contextmanager
def actor(user_id: UUID) -> Iterator[None]:
    """Bind one authenticated user to the current audit scope."""

    token = _current_actor.set(user_id)
    try:
        yield
    finally:
        _current_actor.reset(token)


@event.listens_for(SyncSession, "before_flush")
def apply_audit_fields(session: SyncSession, _flush_context: object, _instances: object) -> None:
    """Apply request-scoped audit timestamps and actors before Platform ORM flushes."""

    # Use one timestamp and actor for every audited row changed by this flush.
    now = utcnow()
    user_id = _current_actor.get()

    # Stamp newly tracked records without replacing explicit audit values.
    for obj in session.new:
        if not isinstance(obj, AuditTable):
            continue

        if obj.created_at is None:
            obj.created_at = now
        if obj.updated_at is None:
            obj.updated_at = now
        if obj.created_id is None:
            obj.created_id = user_id
        if obj.updated_id is None:
            obj.updated_id = user_id

    # Refresh modifications while retaining hard-delete behavior.
    for obj in session.dirty:
        if not isinstance(obj, AuditTable) or not session.is_modified(obj, include_collections=False):
            continue

        obj.updated_at = now
        obj.updated_id = user_id

        if isinstance(obj, TombstoneAuditTable) and obj.deleted_at is not None and obj.deleted_id is None:
            obj.deleted_id = user_id
