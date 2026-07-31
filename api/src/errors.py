class ServiceError(Exception):
    """Base class for expected database service failures."""

    status_code = 500


class NotFoundError(ServiceError):
    """Raise when a required persisted resource is absent."""

    status_code = 404


class ConflictError(ServiceError):
    """Raise when a requested mutation conflicts with persisted state."""

    status_code = 409


class ForbiddenError(ServiceError):
    """Raise when a requested mutation is not permitted by domain rules."""

    status_code = 403


class UnavailableError(ServiceError):
    """Raise when required Platform infrastructure is unavailable."""

    status_code = 503
