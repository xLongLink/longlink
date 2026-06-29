from typing import Any, Callable
from dataclasses import dataclass
from fastapi.responses import Response


class XMLResponse(Response):
    """Render page content with the XML media type."""

    media_type = "application/xml"


@dataclass(slots=True)
class PageDefinition:
    """Describe a registered XML page."""

    path: str
    handler: Callable[..., Any]


page_registry: list[PageDefinition] = []


def register_page(path: str, handler: Callable[..., Any]) -> str:
    """Register one XML page for metadata and return its normalized path."""

    normalized_path = normalize_page_path(path)

    # Keep the latest handler for a path when tests or reloads create multiple app instances.
    page_registry[:] = [page for page in page_registry if page.path != normalized_path]
    page_registry.append(PageDefinition(path=normalized_path, handler=handler))
    return normalized_path


def normalize_page_path(path: str) -> str:
    """Validate and normalize a page path."""

    normalized_path = path.strip()
    if not normalized_path:
        raise ValueError("Page path is required")

    if not normalized_path.startswith("/"):
        normalized_path = f"/{normalized_path}"

    if not normalized_path.endswith(".xml"):
        raise ValueError("Page routes must end with '.xml'")

    return normalized_path
