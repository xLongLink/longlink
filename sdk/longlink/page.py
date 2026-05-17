from __future__ import annotations

from collections.abc import Callable
from typing import Any, TypeVar


PageEndpoint = TypeVar("PageEndpoint", bound=Callable[..., Any])


def page(url: str, icon: str | None = None) -> Callable[[PageEndpoint], PageEndpoint]:
    """Annotate a callable as a LongLink page endpoint."""

    def decorator(endpoint: PageEndpoint) -> PageEndpoint:
        """Attach page metadata to the decorated callable."""

        # Store a normalized metadata payload on the endpoint for downstream discovery.
        metadata = {"url": url}
        if icon is not None:
            # Keep icon metadata optional so endpoints can omit it cleanly.
            metadata["icon"] = icon
        endpoint.__longlink_page__ = metadata
        return endpoint

    return decorator
