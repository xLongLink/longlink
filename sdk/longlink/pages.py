from lxml import etree
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
    name: str | None = None
    icon: str | None = None


page_registry: list[PageDefinition] = []


def _normalize_metadata_value(value: str | None) -> str | None:
    """Return a trimmed metadata value, or None when blank or missing."""

    if not value:
        return None

    normalized_value = value.strip()

    return None if not normalized_value else normalized_value


def extract_longlink_metadata(xml_content: str) -> tuple[str | None, str | None]:
    """Return optional `name` and `icon` metadata from a `<longlink>` root node."""

    try:
        # Metadata parsing must not resolve external resources from local app XML.
        parser = etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)
        root = etree.fromstring(xml_content.encode("utf-8"), parser=parser)
    except (etree.XMLSyntaxError, ValueError):
        return None, None

    if root.tag != "longlink":
        return None, None

    return (
        _normalize_metadata_value(root.get("name")),
        _normalize_metadata_value(root.get("icon")),
    )


def register_page(
    path: str,
    handler: Callable[..., Any],
    *,
    name: str | None = None,
    icon: str | None = None,
) -> str:
    """Register one XML page for metadata and return its normalized path."""

    normalized_path = normalize_page_path(path)

    # Keep the latest handler for a path when tests or reloads create multiple app instances.
    page_registry[:] = [page for page in page_registry if page.path != normalized_path]
    page_registry.append(
        PageDefinition(
            path=normalized_path,
            handler=handler,
            name=_normalize_metadata_value(name),
            icon=_normalize_metadata_value(icon),
        )
    )
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
