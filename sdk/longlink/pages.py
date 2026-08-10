import re
from typing import Literal
from lxml import etree
from dataclasses import dataclass
from fastapi.responses import Response

PAGE_PARAMETER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
PageKind = Literal["jsx", "xml"]


class XMLResponse(Response):
    """Render page content with the XML media type."""

    media_type = "application/xml"


class JSXResponse(Response):
    """Render JSX source as inert text for the LongLink browser runtime."""

    media_type = "text/plain"


@dataclass(slots=True)
class PageDefinition:
    """Describe a registered LongLink page."""

    kind: PageKind
    path: str
    route: str
    tab: str
    name: str | None = None
    icon: str | None = None


def extract_longlink_metadata(root: etree._Element) -> tuple[str | None, str | None]:
    """Return optional `name` and `icon` metadata from a `<longlink>` root node."""

    # Only LongLink roots expose page metadata.
    if root.tag != "longlink":
        return None, None

    # Normalize blank and missing metadata values to the same absent state.
    name = root.get("name")
    icon = root.get("icon")
    return (
        (name or "").strip() or None,
        (icon or "").strip() or None,
    )


def page_file_route(relative_path: str) -> str:
    """Return the browser route pattern for one page file path."""

    normalized_path = relative_path.strip("/")

    # Page routes are backed by XML or browser-transpiled JSX files.
    if not normalized_path.endswith((".jsx", ".xml")):
        raise ValueError("Page file routes must end with '.xml' or '.jsx'")

    path_without_suffix = normalized_path.removesuffix(".xml").removesuffix(".jsx")
    route_segments: list[str] = []

    # Convert filesystem route conventions into React Router-style route patterns.
    for segment in path_without_suffix.split("/"):

        # Index segments map to the current route level.
        if segment == "index":
            continue

        # Bracketed segments define dynamic route parameters.
        if segment.startswith("[") and segment.endswith("]"):
            parameter_name = segment[1:-1].strip()

            # Dynamic route parameters must include a name.
            if not parameter_name:
                raise ValueError("Dynamic page parameters cannot be empty")

            # Dynamic route parameters must be safe identifiers.
            if not PAGE_PARAMETER_PATTERN.fullmatch(parameter_name):
                raise ValueError("Dynamic page parameters must be valid identifier names")

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

        # Empty route segments do not identify tabs.
        if not segment:
            continue

        # Dynamic segments inherit the current static tab.
        if segment.startswith(":"):
            break

        tab_segments.append(segment)

    # Static prefixes become stable tab keys.
    if tab_segments:
        return "/".join(tab_segments)

    return route.removeprefix(":") or "index"


def normalize_page_path(path: str) -> str:
    """Validate and normalize a page path."""

    normalized_path = path.strip()

    # Blank page paths are invalid.
    if not normalized_path:
        raise ValueError("Page path is required")

    # Page paths are stored as absolute routes.
    if not normalized_path.startswith("/"):
        normalized_path = f"/{normalized_path}"

    # Page filenames select the browser parser but are not part of the endpoint URL.
    if not normalized_path.endswith((".jsx", ".xml")):
        raise ValueError("Page routes must end with '.xml' or '.jsx'")

    return normalized_path.removesuffix(".xml").removesuffix(".jsx")
