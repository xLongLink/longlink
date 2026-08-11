import re
from lxml import etree
from dataclasses import dataclass

PAGE_PARAMETER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


@dataclass(slots=True)
class PageDefinition:
    """Describe a registered XML page."""

    path: str
    route: str
    tab: str
    name: str | None = None
    icon: str | None = None


def extract_longlink_metadata(root: etree._Element) -> tuple[str | None, str | None]:
    """Return optional `name` and `icon` metadata from a `<longlink>` root node."""

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

    # Page routes are backed by XML files.
    if not normalized_path.endswith(".xml"):
        raise ValueError("Page file routes must end with '.xml'")

    path_without_suffix = normalized_path.removesuffix(".xml")
    route_segments: list[str] = []

    # Empty file stems cannot provide either an endpoint or browser route.
    if not path_without_suffix:
        raise ValueError("Page file routes must include a file name")

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

        # Static file names cannot introduce browser route parameters or wildcards.
        if segment.startswith(":") or "*" in segment:
            raise ValueError("Static page route segments cannot contain route parameters or wildcards")

        route_segments.append(segment)

    return "/".join(route_segments)


def page_route_key(route: str) -> str:
    """Return a route key that treats dynamic parameter names as equivalent."""

    return "/".join(":" if segment.startswith(":") else segment for segment in route.split("/"))
