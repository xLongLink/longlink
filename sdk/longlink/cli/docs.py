import re
import click
from lxml import etree
from typing import cast
from functools import cache
from collections import deque
from collections.abc import Iterator
from longlink.constants import ROOT

XSD = "{http://www.w3.org/2001/XMLSchema}"
DOCS = "{urn:longlink:xsd-docs}"


@cache
def _schemas() -> tuple[etree._Element, ...]:
    """Parse and cache the bundled component schemas."""

    # Parse trusted package files without resolving external resources.
    parser = etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)
    root = ROOT / ".static" / "xsd"
    schema = etree.parse(str(root / "schema.xsd"), parser).getroot()
    paths = [root / include.attrib["schemaLocation"] for include in schema.findall(f"{XSD}include")]
    return tuple(etree.parse(str(path), parser).getroot() for path in paths)


def _text(node: etree._Element, path: str) -> str:
    """Read normalized annotation text from an XSD node."""

    # Namespace URIs work regardless of the prefix used by each schema.
    child = node.find(path)
    text = "".join(cast(Iterator[str], child.itertext())) if child is not None else ""
    return text.strip() if path.endswith(f"{DOCS}example") else " ".join(text.split())


def _complex_type(element: etree._Element, schemas: tuple[etree._Element, ...]) -> etree._Element | None:
    """Resolve an element's inline or named complex type."""

    # Prefer local types, then scan the small fixed schema collection.
    inline = element.find(f"{XSD}complexType")
    if inline is not None:
        return inline
    name = element.get("type", "").rsplit(":", 1)[-1]
    return next((node for schema in schemas for node in schema.findall(f"{XSD}complexType") if node.get("name") == name), None)


def _element_lines(element: etree._Element, schemas: tuple[etree._Element, ...]) -> list[str]:
    """Render one component or helper element."""

    # Resolve descriptions and inherited runtime attributes.
    type_node = _complex_type(element, schemas)
    description = _text(element, f"{XSD}annotation/{XSD}documentation")
    attributes = type_node.findall(f"{XSD}attribute") if type_node is not None else []
    if type_node is not None and type_node.find(f"{XSD}attributeGroup") is not None:
        groups = (group for schema in schemas for group in schema.findall(f"{XSD}attributeGroup"))
        runtime = next((group for group in groups if group.get("name") == "XmlRuntimeAttributes"), None)
        if runtime is not None:
            attributes.extend(runtime.findall(f"{XSD}attribute"))
    lines = [element.get("name", "")]
    if description:
        lines.append(description)
    lines.append("Attributes")
    if not attributes:
        lines.append("- none")
        return lines

    # Render only authoring constraints useful in ordinary component XML.
    for attribute in attributes:
        type_name = attribute.get("type", "string").rsplit(":", 1)[-1]
        simple_type = attribute.find(f"{XSD}simpleType")

        # Resolve named types only when no inline type is declared.
        if simple_type is None:
            simple_types = (node for schema in schemas for node in schema.findall(f"{XSD}simpleType"))
            simple_type = next((node for node in simple_types if node.get("name") == type_name), None)

        values = (
            [] if simple_type is None else [value.get("value", "") for value in simple_type.findall(f"{XSD}restriction/{XSD}enumeration")]
        )
        details = ["required" if attribute.get("use") == "required" else "optional"]
        details.extend(f"{name}={attribute.get(name)}" for name in ("default", "fixed") if attribute.get(name) is not None)
        if values:
            details.append(f"values={', '.join(values)}")
        documentation = _text(attribute, f"{XSD}annotation/{XSD}documentation")
        lines.append(f"- {attribute.get('name')}: {type_name} ({'; '.join(details)}){f' - {documentation}' if documentation else ''}")
    return lines


def _helpers(
    component: etree._Element,
    example: str,
    elements: dict[str, etree._Element],
    schemas: tuple[etree._Element, ...],
) -> list[etree._Element]:
    """Return helper elements used by a component."""

    # Follow declared child references and exact tags from the authored example.
    type_node = _complex_type(component, schemas)
    pending = deque(type_node.iter(f"{XSD}element")) if type_node is not None else deque()
    for name in re.findall(r"<\s*/?\s*([A-Za-z_][\w.-]*)", example):
        if name in elements and elements[name].find(f"{XSD}annotation/{XSD}appinfo/{DOCS}docs") is None:
            pending.append(elements[name])
    helpers: dict[str, etree._Element] = {}
    while pending:
        declaration = pending.popleft()
        name = declaration.get("ref", "").rsplit(":", 1)[-1] or declaration.get("name", "")
        if not name or name == component.get("name") or name in helpers:
            continue
        helper = elements.get(name, declaration)
        helpers[name] = helper
        helper_type = _complex_type(helper, schemas)
        if helper_type is not None:
            pending.extend(helper_type.iter(f"{XSD}element"))

    return list(helpers.values())


@click.command(name="docs")
@click.argument("component", required=False)
def docs_command(component: str | None) -> None:
    """List XML components or show documentation for one component."""

    # Build the catalog from top-level elements carrying docs metadata.
    schemas = _schemas()
    elements = {node.get("name", ""): node for schema in schemas for node in schema.findall(f"{XSD}element") if node.get("name")}
    metadata_path = f"{XSD}annotation/{XSD}appinfo/{DOCS}docs"
    documented = [(element, metadata) for element in elements.values() if (metadata := element.find(metadata_path)) is not None]
    # A missing component prints the grouped discovery catalog.
    if component is None:
        lines = ["LongLink XML components"]
        documented.sort(key=lambda entry: entry[0].get("name", ""))
        for category in sorted({metadata.get("category", "") for _, metadata in documented}):
            lines.append("")
            lines.append(category)
            for element, metadata in documented:
                if metadata.get("category") == category:
                    description = _text(element, f"{XSD}annotation/{XSD}documentation")
                    lines.append(f"- {element.get('name')} - {description}")
        lines.append("")
        lines.append("Run `longlink docs <component>` for attributes and examples.")
        click.echo("\n".join(lines))
        return

    # Resolve either the XML element name or documentation slug.
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
        raise click.ClickException(f"Unknown component: {component}. Run `longlink docs` to list available components.")

    # Render the component, its helper elements, and its authored example.
    element, metadata = match
    example = _text(element, f"{XSD}annotation/{XSD}appinfo/{DOCS}example")
    lines = _element_lines(element, schemas)
    lines[0] = f"{lines[0]} [{metadata.get('category', '')}]"
    helpers = _helpers(element, example, elements, schemas)
    for helper in helpers:
        lines.append("")
        lines.append("Related element")
        lines.extend(_element_lines(helper, schemas))
    lines.append("")
    lines.append("Example")
    lines.append(example or "- none")
    click.echo("\n".join(lines))
