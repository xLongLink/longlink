from __future__ import annotations

from collections.abc import Callable
from typing import Any, TypeVar


PageEndpoint = TypeVar("PageEndpoint", bound=Callable[..., Any])


def page(url: str) -> Callable[[PageEndpoint], PageEndpoint]:
    """Annotate a callable as a LongLink page endpoint."""

    def decorator(endpoint: PageEndpoint) -> PageEndpoint:
        """Attach page metadata to the decorated callable."""

        endpoint.__longlink_page__ = {"url": url}
        return endpoint

    return decorator
