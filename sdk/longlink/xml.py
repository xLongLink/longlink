import xmltodict
from typing import Any
from pathlib import Path


def load_page_schema_from_xml(path: str | Path) -> list[dict[str, Any]]:
    document = xmltodict.parse(Path(path).read_text(encoding="utf-8"))
    return _normalize_page(document)


def load_page_metadata_from_xml(path: str | Path) -> dict[str, str]:
    document = xmltodict.parse(Path(path).read_text(encoding="utf-8"))
    root = _get_page_root(document)

    metadata: dict[str, str] = {}
    for key in ("name", "icon"):
        value = root.get(f"@{key}") or root.get(key)
        if isinstance(value, str) and value.strip():
            metadata[key] = value.strip()

    return metadata


def _normalize_page(document: dict[str, Any]) -> list[dict[str, Any]]:
    root = _get_page_root(document)

    components = root.get("component", [])
    return [_normalize_component(component) for component in _ensure_list(components)]


def _get_page_root(document: dict[str, Any]) -> dict[str, Any]:
    root = document.get("page") or document.get("Page")
    if not isinstance(root, dict):
        raise ValueError("XML page document must contain a <page> or <Page> root element.")

    return root


def _normalize_component(node: Any) -> dict[str, Any]:
    if not isinstance(node, dict):
        raise ValueError("Each <component> entry must be an XML object.")

    component_type = node.get("@type") or node.get("type")
    if not component_type:
        raise ValueError("Each <component> entry must define a type.")

    props = _normalize_value(node.get("props", {}))
    children_node = node.get("children", {})

    if isinstance(children_node, dict):
        raw_children = children_node.get("component", [])
    elif children_node in (None, ""):
        raw_children = []
    else:
        raw_children = children_node

    return {
        "type": str(component_type),
        "props": props if isinstance(props, dict) else {},
        "children": [_normalize_component(child) for child in _ensure_list(raw_children)],
    }


def _normalize_value(value: Any) -> Any:
    if isinstance(value, list):
        return [_normalize_value(item) for item in value]

    if isinstance(value, dict):
        if set(value) == {"#text"}:
            return _coerce_scalar(value["#text"])

        normalized: dict[str, Any] = {}
        for key, item in value.items():
            if key == "#text":
                text = _coerce_scalar(item)
                if text not in ("", None):
                    normalized["text"] = text
                continue

            normalized[key.removeprefix("@")] = _normalize_value(item)

        if set(normalized) == {"item"}:
            return _ensure_list(normalized["item"])

        return normalized

    return _coerce_scalar(value)


def _coerce_scalar(value: Any) -> Any:
    if not isinstance(value, str):
        return value

    stripped = value.strip()
    lowered = stripped.lower()

    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered in {"null", "none"}:
        return None

    try:
        return int(stripped)
    except ValueError:
        pass

    try:
        return float(stripped)
    except ValueError:
        return stripped


def _ensure_list(value: Any) -> list[Any]:
    if value in (None, ""):
        return []
    if isinstance(value, list):
        return value
    return [value]
