import re
from pathlib import Path
from dataclasses import dataclass

STATIC_ROUTE_SEGMENT_PATTERN = re.compile(r"[A-Za-z0-9._~-]+")


@dataclass(slots=True)
class ViewDefinition:
    """Describe a registered View."""

    path: str
    route: str


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
                raise ValueError("Dynamic View parameters cannot be empty")

            # Dynamic route parameters must be safe identifiers.
            if not parameter_name.isascii() or not parameter_name.isidentifier():
                raise ValueError("Dynamic View parameters must be valid identifier names")

            route_segments.append(f":{parameter_name}")
            continue

        # Static file names cannot introduce browser route parameters or wildcards.
        if segment.startswith(":") or "*" in segment or "{" in segment or "}" in segment:
            raise ValueError("Static View route segments cannot contain route parameters or wildcards")

        # Static routes must satisfy the web manifest's normalized path grammar.
        if segment in {".", ".."} or STATIC_ROUTE_SEGMENT_PATTERN.fullmatch(segment) is None:
            raise ValueError("Static View route segments must use URL-safe file names")

        route_segments.append(segment)

    return f"/{'/'.join(route_segments)}"


def discover(views_directory: Path) -> list[tuple[ViewDefinition, bytes]]:
    """Discover and validate all Views before registering any route."""

    # Track the catalog and normalized routes for the complete discovery operation.
    registered_route_keys: set[str] = set()
    discovered_views: list[tuple[ViewDefinition, bytes]] = []

    # Discover JSX source in deterministic order without compiling JavaScript in Python.
    for view_file in sorted(views_directory.rglob("*.jsx")):
        path_without_suffix = view_file.relative_to(views_directory).as_posix().removesuffix(".jsx")
        view_path = f"views/{path_without_suffix}"

        # Read source without parsing or executing JavaScript.
        content = view_file.read_text(encoding="utf-8")
        encoded_content = content.encode("utf-8")
        if not content.strip() or len(encoded_content) > 1_000_000:
            raise ValueError(f"View source must contain between 1 and 1000000 bytes: {view_file}")

        # Normalize static case and dynamic parameter names for collision detection.
        view_route = view_stem_route(path_without_suffix)
        relative_route = view_route.removeprefix("/")
        route_key = "/".join(":" if segment.startswith(":") else segment.lower() for segment in relative_route.split("/"))

        # View endpoints and browser routes must remain unique across all directories.
        if route_key in registered_route_keys:
            raise ValueError(f"Browser route '{view_route}' is already registered")

        # Keep each validated definition paired with its startup source snapshot.
        definition = ViewDefinition(
            path=view_path,
            route=view_route,
        )
        discovered_views.append((definition, encoded_content))
        registered_route_keys.add(route_key)

    return discovered_views
