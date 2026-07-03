from lxml import etree
from typing import Any
from dataclasses import dataclass
from collections.abc import Callable
from fastapi.responses import Response


class XMLResponse(Response):
    """Render page content with the XML media type."""

    media_type = "application/xml"


@dataclass(slots=True)
class PageDefinition:
    """Describe a registered XML page."""

    path: str
    handler: Callable[..., Any]
    route: str
    tab: str
    name: str | None = None
    icon: str | None = None


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


def page_file_route(relative_path: str) -> str:
    """Return the browser route pattern for one page file path."""

    normalized_path = relative_path.strip("/")
    if not normalized_path.endswith(".xml"):
        raise ValueError("Page file routes must end with '.xml'")

    path_without_suffix = normalized_path.removesuffix(".xml")
    route_segments: list[str] = []

    # Convert filesystem route conventions into React Router-style route patterns.
    for segment in path_without_suffix.split("/"):
        if segment == "index":
            continue

        if segment.startswith("[") and segment.endswith("]"):
            parameter_name = segment[1:-1].strip()

            if not parameter_name:
                raise ValueError("Dynamic page parameters cannot be empty")

            route_segments.append(f":{parameter_name}")
            continue

        route_segments.append(segment)

    return "/".join(route_segments)


def page_file_tab(relative_path: str) -> str:
    """Return the navigation tab key for one page file path."""

    route = page_file_route(relative_path)
    tab_segments: list[str] = []

    # Static pages keep their full route key, while dynamic pages inherit the static prefix.
    for segment in route.split("/"):
        if not segment:
            continue

        if segment.startswith(":"):
            break

        tab_segments.append(segment)

    if tab_segments:
        return "/".join(tab_segments)

    return route.removeprefix(":") or "index"


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
