from .base import AuditTable
from sqlmodel import Session as SyncSession
from sqlalchemy import event
from longlink.utils.time import utcnow

# ---------------------------------------------------------------------
# SQLModel audit hook
# ---------------------------------------------------------------------


@event.listens_for(SyncSession, "before_flush")
def apply_audit_fields(session: SyncSession, _flush_context: object, _instances: object) -> None:
    """
    Automatically apply audit fields before SQLModel flushes changes.

    Works for AsyncSession because AsyncSession uses an internal sync Session.
    """

    # Resolve the request-local actor after database package initialization completes.
    from longlink.context import _current_identity

    # Capture one timestamp and actor for every row changed in this flush.
    now = utcnow()
    user_id = _current_identity.get()

    # Apply audit fields to newly tracked rows.
    for obj in (obj for obj in session.new if isinstance(obj, AuditTable)):
        # Preserve explicitly assigned creation timestamps.
        if obj.created_at is None:
            obj.created_at = now

        # Preserve explicitly assigned update timestamps.
        if obj.updated_at is None:
            obj.updated_at = now

        # Preserve explicitly assigned creator IDs.
        if obj.created_id is None:
            obj.created_id = user_id

        # Preserve explicitly assigned updater IDs.
        if obj.updated_id is None:
            obj.updated_id = user_id

    # Refresh audit timestamps for modified tracked rows.
    for obj in (obj for obj in session.dirty if isinstance(obj, AuditTable)):
        # Skip rows without column-level changes.
        if not session.is_modified(obj, include_collections=False):
            continue

        obj.updated_at = now
        obj.updated_id = user_id

        # Record who performed pending soft deletes.
        if obj.deleted_at is not None and obj.deleted_id is None:
            obj.deleted_id = user_id

    # Convert hard deletes into soft deletes.
    for obj in [obj for obj in session.deleted if isinstance(obj, AuditTable)]:
        session.add(obj)

        obj.deleted_at = now
        obj.deleted_id = user_id
        obj.updated_at = now
        obj.updated_id = user_id
