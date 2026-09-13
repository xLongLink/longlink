from uuid import UUID
from typing import Protocol, cast
from datetime import datetime
from contextlib import contextmanager
from sqlalchemy import event
from contextvars import ContextVar
from sqlalchemy.orm import Session as SyncSession
from collections.abc import Iterator
from longlink.utils.time import utcnow

current_actor: ContextVar[UUID | None] = ContextVar("current_actor", default=None)


class AuditRecord(Protocol):
    """Describe mutable audit fields supplied by an application model base."""

    created_at: datetime | None
    updated_at: datetime | None
    deleted_at: datetime | None
    created_id: UUID | None
    updated_id: UUID | None
    deleted_id: UUID | None


@contextmanager
def actor(user_id: UUID | None) -> Iterator[None]:
    """Bind one authenticated user or anonymous request to the current audit scope."""

    token = current_actor.set(user_id)
    try:
        yield
    finally:
        current_actor.reset(token)


def install_listener(session_type: type[SyncSession], audit_type: type[object]) -> None:
    """Register audit attribution for one application's ORM session and model bases."""

    @event.listens_for(session_type, "before_flush")
    def apply_audit_fields(session: SyncSession, _flush_context: object, _instances: object) -> None:
        """Apply request-scoped audit fields before ORM flushes changes."""

        # Capture one timestamp and actor for every row changed in this flush.
        now = utcnow()
        user_id = current_actor.get()

        # Apply audit fields to newly tracked rows.
        for obj in session.new:
            if not isinstance(obj, audit_type):
                continue

            record = cast(AuditRecord, obj)
            if record.created_at is None:
                record.created_at = now
            if record.updated_at is None:
                record.updated_at = now
            if record.created_id is None:
                record.created_id = user_id
            if record.updated_id is None:
                record.updated_id = user_id

        # Refresh audit timestamps for modified tracked rows.
        for obj in session.dirty:
            if not isinstance(obj, audit_type) or not session.is_modified(obj, include_collections=False):
                continue

            record = cast(AuditRecord, obj)
            record.updated_at = now
            record.updated_id = user_id

            if record.deleted_at is not None and record.deleted_id is None:
                record.deleted_id = user_id
