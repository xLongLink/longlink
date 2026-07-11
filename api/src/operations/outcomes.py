from enum import StrEnum
from dataclasses import dataclass


class OperationOutcomeState(StrEnum):
    """Supported results from one operation handler attempt."""

    complete = "complete"
    defer = "defer"
    fail = "fail"


@dataclass(frozen=True)
class OperationOutcome:
    """Represent the requested state transition after a handler attempt."""

    state: OperationOutcomeState
    error: str | None = None
    delay: int | None = None


def complete() -> OperationOutcome:
    """Return an outcome that completes the operation."""

    # The dispatcher owns the database transition for completed operations.
    return OperationOutcome(OperationOutcomeState.complete)


def defer(delay: int | None = None) -> OperationOutcome:
    """Return an outcome that schedules the operation for a later attempt."""

    # The dispatcher owns lease release and retry scheduling.
    return OperationOutcome(OperationOutcomeState.defer, delay=delay)


def fail(error: str) -> OperationOutcome:
    """Return an outcome that fails the operation with a public error message."""

    # The dispatcher owns error sanitization and terminal persistence.
    return OperationOutcome(OperationOutcomeState.fail, error=error)
