import re
from dataclasses import dataclass

STATIC_ROUTE_SEGMENT_PATTERN = re.compile(r"[A-Za-z0-9._~-]+")


@dataclass(slots=True)
class ViewDefinition:
    """Describe a registered XML view."""

    path: str
    route: str
    tab: str
    name: str | None = None
    icon: str | None = None


def view_stem_route(view_stem: str) -> str:
    """Return the browser route pattern for one suffix-free view path."""

    route_segments: list[str] = []

    # Empty file stems cannot provide either an endpoint or browser route.
    if not view_stem:
        raise ValueError("View file routes must include a file name")

    # Convert filesystem route conventions into React Router-style route patterns.
    for segment in view_stem.split("/"):
        # Index segments map to the current route level.
        if segment == "index":
            continue

        # Bracketed segments define dynamic route parameters.
        if segment.startswith("[") and segment.endswith("]"):
            parameter_name = segment[1:-1].strip()

            # Dynamic route parameters must include a name.
            if not parameter_name:
                raise ValueError("Dynamic view parameters cannot be empty")

            # Dynamic route parameters must be safe identifiers.
            if not parameter_name.isascii() or not parameter_name.isidentifier():
                raise ValueError("Dynamic view parameters must be valid identifier names")

            route_segments.append(f":{parameter_name}")
            continue

        # Static file names cannot introduce browser route parameters or wildcards.
        if segment.startswith(":") or "*" in segment or "{" in segment or "}" in segment:
            raise ValueError("Static view route segments cannot contain route parameters or wildcards")

        # Static routes must satisfy the web manifest's normalized path grammar.
        if segment in {"", ".", ".."} or STATIC_ROUTE_SEGMENT_PATTERN.fullmatch(segment) is None:
            raise ValueError("Static view route segments must use URL-safe file names")

        route_segments.append(segment)

    return f"/{'/'.join(route_segments)}"
