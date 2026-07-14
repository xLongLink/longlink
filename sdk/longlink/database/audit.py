import contextlib
from uuid import UUID
from .base import Table
from typing import Any
from fastapi import FastAPI, Request
from sqlmodel import Session as SyncSession
from sqlalchemy import event
from contextvars import ContextVar
from collections.abc import Callable, Awaitable, Generator
from longlink.utils.time import utcnow
from starlette.responses import Response

_current_user_id: ContextVar[UUID | None] = ContextVar("current_user_id", default=None)


@contextlib.contextmanager
def audit_user_scope(user_id: UUID | None) -> Generator[None]:
    """Bind an audit user ID for the current execution scope."""

    token = _current_user_id.set(user_id)

    # Keep the scoped user bound until the caller exits.
    try:
        yield

    # Always restore the previous audit context.
    finally:
        _current_user_id.reset(token)


# ---------------------------------------------------------------------
# SQLModel audit hook
# ---------------------------------------------------------------------


@event.listens_for(SyncSession, "before_flush")
def apply_audit_fields(session: SyncSession, flush_context: Any, instances: Any) -> None:
    """
    Automatically apply audit fields before SQLModel flushes changes.

    Works for AsyncSession because AsyncSession uses an internal sync Session.
    """

    now = utcnow()
    user_id = _current_user_id.get()

    # Apply audit fields to newly tracked rows.
    for obj in session.new:

        # Ignore rows that do not use LongLink audit fields.
        if not isinstance(obj, Table):
            continue

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
    for obj in session.dirty:

        # Ignore rows that do not use LongLink audit fields.
        if not isinstance(obj, Table):
            continue

        # Skip rows without column-level changes.
        if not session.is_modified(obj, include_collections=False):
            continue

        obj.updated_at = now
        obj.updated_id = user_id

        # Record who performed pending soft deletes.
        if obj.deleted_at is not None and obj.deleted_id is None:
            obj.deleted_id = user_id

    # Convert hard deletes into soft deletes.
    for obj in list(session.deleted):

        # Ignore rows that do not use LongLink audit fields.
        if not isinstance(obj, Table):
            continue

        session.add(obj)

        obj.deleted_at = now
        obj.deleted_id = user_id
        obj.updated_at = now
        obj.updated_id = user_id


# ---------------------------------------------------------------------
# Recommended FastAPI middleware version
# ---------------------------------------------------------------------


def install_audit_middleware(app: FastAPI) -> None:
    """
    Middleware keeps the user context active for the whole request lifecycle.
    """

    async def audit_context_middleware(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        """Bind the request user ID for the duration of the request."""

        user_id: UUID | None = None

        raw_user_id = request.headers.get("x-user-id")

        # Decode trusted user headers when present.
        if raw_user_id is not None:

            # Parse valid UUID headers into audit user IDs.
            try:
                user_id = UUID(raw_user_id)

            # Invalid headers run without an audit user.
            except ValueError:
                user_id = None

        # Keep the user bound across downstream request handling.
        with audit_user_scope(user_id):
            response = await call_next(request)
            return response

    app.middleware("http")(audit_context_middleware)
