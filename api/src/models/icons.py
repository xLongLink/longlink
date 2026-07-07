import re
from enum import Enum
from pydantic import BaseModel

ICON_WORD_BOUNDARY = re.compile(r"([a-z0-9])([A-Z])")
ICON_NON_SLUG = re.compile(r"[^a-zA-Z0-9]+")


class Icon(str, Enum):
    """Lucide icon slugs supported by the web runtime."""

    ACTIVITY = "activity"
    ARROW_RIGHT = "arrow-right"
    BANKNOTE = "banknote"
    BELL = "bell"
    BOX = "box"
    BOXES = "boxes"
    BUILDING_2 = "building-2"
    CHECK = "check"
    CLIPBOARD_LIST = "clipboard-list"
    CONTAINER = "container"
    CPU = "cpu"
    DATABASE = "database"
    DOWNLOAD = "download"
    HARD_DRIVE = "hard-drive"
    LAYERS = "layers"
    LAYOUT_DASHBOARD = "layout-dashboard"
    LAYOUT_GRID = "layout-grid"
    LINK = "link"
    LIST = "list"
    LIST_CHECK = "list-check"
    MAP_PIN = "map-pin"
    PLUS = "plus"
    ROCKET = "rocket"
    ROTATE_CCW = "rotate-ccw"
    SETTINGS_2 = "settings-2"
    SHIELD_CHECK = "shield-check"
    SLIDERS_HORIZONTAL = "sliders-horizontal"
    TIMER = "timer"
    USERS = "users"
    X = "x"


class IconCatalog(BaseModel):
    """List supported Lucide icon slugs."""

    # Catalog
    icons: list[Icon]


def parse_icon(icon: str | Icon | None) -> Icon | None:
    """Return a normalized icon enum member or reject unknown slugs."""

    if icon is None:
        return None

    if isinstance(icon, Icon):
        normalized_icon = icon.value
    else:
        normalized_icon = ICON_WORD_BOUNDARY.sub(r"\1-\2", icon.strip())
        normalized_icon = ICON_NON_SLUG.sub("-", normalized_icon).lower().strip("-")

    if not normalized_icon:
        return None

    try:
        return Icon(normalized_icon)
    except ValueError as exc:
        raise ValueError("Icon must be a supported Lucide icon slug") from exc
