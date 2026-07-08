class ComputeError(ValueError):
    """Base error raised by compute clients."""


class ComputeResourceError(ComputeError):
    """Raised when a compute backend resource cannot be inspected."""
