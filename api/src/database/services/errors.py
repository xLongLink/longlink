class ServiceError(Exception):
    """Base class for expected database service failures."""


class NotFoundError(ServiceError):
    """Raise when a required persisted resource is absent."""


class ConflictError(ServiceError):
    """Raise when a requested mutation conflicts with persisted state."""


class ForbiddenError(ServiceError):
    """Raise when a requested mutation is not permitted by domain rules."""


class UnavailableError(ServiceError):
    """Raise when required Platform infrastructure is unavailable."""
