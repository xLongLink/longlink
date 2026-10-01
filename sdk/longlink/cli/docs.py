import re
import typer
from lxml import etree
from typing import cast
from functools import cache
from collections import deque
from collections.abc import Mapping, Iterator, Sequence
from longlink.constants import ROOT
from longlink.cli.errors import CliError

XSD = "{http://www.w3.org/2001/XMLSchema}"
DOCS = "{urn:longlink:xsd-docs}"


@cache
def _schemas() -> tuple[etree._Element, ...]:
    """Parse and cache the bundled component schemas."""

    # Parse trusted package files without resolving external resources.
    parser = etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)
    root = ROOT / ".static" / "xsd"
    schema = etree.parse(str(root / "schema.xsd"), parser).getroot()
    return (schema,) + tuple(
        etree.parse(str(root / include.attrib["schemaLocation"]), parser).getroot() for include in schema.iterfind(f"{XSD}include")
    )


def _text(node: etree._Element, path: str) -> str:
    """Read normalized annotation text from an XSD node."""

    # Namespace URIs work regardless of the prefix used by each schema.
    child = node.find(path)
    text = "".join(cast(Iterator[str], child.itertext())) if child is not None else ""
    return text.strip() if path.endswith(f"{DOCS}example") else " ".join(text.split())


def _complex_type(element: etree._Element, complex_types: Mapping[str, etree._Element]) -> etree._Element | None:
    """Resolve an element's inline or named complex type."""

    # Prefer local types, then resolve the indexed named type.
    inline = element.find(f"{XSD}complexType")
    if inline is not None:
        return inline
    name = element.get("type", "").rsplit(":", 1)[-1]
    return complex_types.get(name)


def _element_lines(
    element: etree._Element,
    complex_types: Mapping[str, etree._Element],
    simple_types: Mapping[str, etree._Element],
    runtime_attributes: Sequence[etree._Element],
) -> list[str]:
    """Render one component or helper element."""

    # Resolve descriptions and inherited runtime attributes.
    type_node = _complex_type(element, complex_types)
    description = (
        _text(element, f"{DOCS}description") if element.tag == f"{DOCS}topic" else _text(element, f"{XSD}annotation/{XSD}documentation")
    )
    attributes = type_node.findall(f"{XSD}attribute") if type_node is not None else []
    if type_node is not None and type_node.find(f"{XSD}attributeGroup") is not None:
        attributes.extend(runtime_attributes)
    lines = [element.get("name", "")]
    if description:
        lines.append(description)
    lines.append("Attributes")
    if not attributes:
        lines.append("- none")

    # Render only authoring constraints useful in ordinary component markup.
    for attribute in attributes:
        type_name = attribute.get("type", "string").rsplit(":", 1)[-1]
        simple_type = attribute.find(f"{XSD}simpleType")

        # Resolve named types only when no inline type is declared.
        if simple_type is None:
            simple_type = simple_types.get(type_name)

        values = (
            [] if simple_type is None else [value.get("value", "") for value in simple_type.iterfind(f"{XSD}restriction/{XSD}enumeration")]
        )
        details = ["required" if attribute.get("use") == "required" else "optional"]
        details.extend(f"{name}={attribute.get(name)}" for name in ("default", "fixed") if attribute.get(name) is not None)
        if values:
            details.append(f"values={', '.join(values)}")
        documentation = _text(attribute, f"{XSD}annotation/{XSD}documentation")
        lines.append(f"- {attribute.get('name')}: {type_name} ({'; '.join(details)}){f' - {documentation}' if documentation else ''}")
    return lines


def _child_elements(type_node: etree._Element | None, groups: Mapping[str, etree._Element]) -> Iterator[etree._Element]:
    """Yield local child declarations, expanding shared XSD groups in document order."""

    # Missing complex types have no declared children.
    if type_node is None:
        return

    # Expand group references without changing the declarations' local scope.
    for node in type_node.iter(f"{XSD}element", f"{XSD}group"):
        if node.tag == f"{XSD}element":
            yield node
        elif reference := node.get("ref"):
            name = reference.rsplit(":", 1)[-1]
            group = groups.get(name)
            if group is None:
                raise CliError(f"Unknown XSD group: {name}")
            yield from _child_elements(group, groups)


def _helpers(
    component: etree._Element,
    example: str,
    elements: dict[str, etree._Element],
    complex_types: Mapping[str, etree._Element],
    groups: Mapping[str, etree._Element],
) -> list[etree._Element]:
    """Return helper elements used by a component."""

    # Follow declared child references and exact tags from the authored example.
    type_node = _complex_type(component, complex_types)
    pending = deque(_child_elements(type_node, groups))
    for name in re.findall(r"<\s*/?\s*([A-Za-z_][\w.-]*)", example):
        element = elements.get(name)
        if element is not None and element.find(f"{XSD}annotation/{XSD}appinfo/{DOCS}docs") is None:
            pending.append(element)
    helpers: dict[str, etree._Element] = {}
    while pending:
        declaration = pending.popleft()
        reference = declaration.get("ref", "").rsplit(":", 1)[-1]
        name = reference or declaration.get("name", "")
        if not name or name == component.get("name") or name in helpers:
            continue
        helper = elements[reference] if reference else declaration
        helpers[name] = helper
        helper_type = _complex_type(helper, complex_types)
        pending.extend(_child_elements(helper_type, groups))

    return list(helpers.values())


def docs_command(component: str | None = None, category: str | None = None) -> None:
    """List View components or show documentation for one component."""

    # Build the catalog from top-level elements carrying docs metadata.
    schemas = _schemas()
    elements = {node.get("name", ""): node for schema in schemas for node in schema.iterfind(f"{XSD}element") if node.get("name")}
    metadata_path = f"{XSD}annotation/{XSD}appinfo/{DOCS}docs"
    documented = [(element, metadata) for element in elements.values() if (metadata := element.find(metadata_path)) is not None]

    # Read runtime topics and category order from the same XML metadata as the web generator.
    info_path = f"{XSD}annotation/{XSD}appinfo"
    topics = [topic for schema in schemas for topic in schema.iterfind(f"{info_path}/{DOCS}topic")]
    documented.extend((topic, topic) for topic in topics)
    categories = [entry.get("name", "") for schema in schemas for entry in schema.iterfind(f"{info_path}/{DOCS}category")]
    for element, metadata in documented:
        if metadata.get("category") not in categories:
            raise CliError(f"Unknown documentation category for {element.get('name')}: {metadata.get('category')}")

    # Validate an optional category at the CLI boundary.
    if category is not None:
        match_category = next((name for name in categories if name.casefold() == category.casefold()), None)
        if match_category is None:
            raise CliError(f"Unknown category: {category}. Available categories: {', '.join(categories)}.")
        documented = [(element, metadata) for element, metadata in documented if metadata.get("category") == match_category]

    # A missing component prints the grouped discovery catalog.
    if component is None:
        lines = ["LongLink View components"]
        documented.sort(key=lambda entry: entry[0].get("name", ""))
        for category_name in categories:
            entries = [element for element, metadata in documented if metadata.get("category") == category_name]
            if not entries:
                continue
            lines.append("")
            lines.append(category_name)
            for element in entries:
                description = (
                    _text(element, f"{DOCS}description")
                    if element.tag == f"{DOCS}topic"
                    else _text(element, f"{XSD}annotation/{XSD}documentation")
                )
                lines.append(f"- {element.get('name')} - {description}")
        lines.append("")
        lines.append("Run `longlink docs ui --component <component>` for attributes and examples.")
        typer.echo("\n".join(lines))
        return

    # Resolve either the component name or documentation slug.
    normalized = component.casefold()
    match = next(
        (
            (element, metadata)
            for element, metadata in documented
            if normalized in {element.get("name", "").casefold(), metadata.get("slug", "").casefold()}
        ),
        None,
    )
    if match is None:
        raise CliError(f"Unknown component: {component}. Run `longlink docs` to list available components.")

    # Index immutable schema definitions once, preserving first-declaration lookup precedence.
    complex_types: dict[str, etree._Element] = {}
    simple_types: dict[str, etree._Element] = {}
    groups: dict[str, etree._Element] = {}
    for schema in schemas:
        for node in schema.iterfind(f"{XSD}complexType"):
            name = node.get("name")
            if name is not None:
                complex_types.setdefault(name, node)
        for node in schema.iterfind(f"{XSD}simpleType"):
            name = node.get("name")
            if name is not None:
                simple_types.setdefault(name, node)
        for node in schema.iterfind(f"{XSD}group"):
            name = node.get("name")
            if name is not None:
                groups.setdefault(name, node)
    attribute_groups = (group for schema in schemas for group in schema.iterfind(f"{XSD}attributeGroup"))
    runtime = next((group for group in attribute_groups if group.get("name") == "XmlRuntimeAttributes"), None)
    runtime_attributes = list(runtime.iterfind(f"{XSD}attribute")) if runtime is not None else []

    # Render the component, its helper elements, and its authored example.
    element, metadata = match
    example = (
        _text(element, f"{DOCS}example") if element.tag == f"{DOCS}topic" else _text(element, f"{XSD}annotation/{XSD}appinfo/{DOCS}example")
    )
    lines = _element_lines(element, complex_types, simple_types, runtime_attributes)
    lines[0] = f"{lines[0]} [{metadata.get('category', '')}]"
    helpers = _helpers(element, example, elements, complex_types, groups)
    for helper in helpers:
        lines.append("")
        lines.append("Related element")
        lines.extend(_element_lines(helper, complex_types, simple_types, runtime_attributes))
    lines.append("")
    lines.append("Example")
    lines.append(example or "- none")
    typer.echo("\n".join(lines))
