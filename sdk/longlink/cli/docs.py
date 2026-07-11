import click
from lxml import etree
from typing import Any, TypedDict
from pathlib import Path
from longlink.constants import ROOT

XSD_NAMESPACE = {"xsd": "http://www.w3.org/2001/XMLSchema"}


class ComponentProp(TypedDict):
    """Describe one XML component attribute."""

    name: str
    type: str
    values: list[str]
    default: str | None
    required: bool


class ComponentTypeInfo(TypedDict):
    """Describe XML component type metadata collected from XSD."""

    props: list[ComponentProp]
    any_attribute: bool
    children_supported: bool


class ComponentDetails(ComponentTypeInfo):
    """Describe rendered XML component documentation data."""

    name: str
    description: str
    children_description: str


def resolve_component_schema(component: str) -> Path:
    """Resolve the bundled XSD schema for a documented XML component."""

    adapters = ROOT / ".static" / "xsd" / "adapters"
    normalized = component.casefold()

    # Prefer direct schema filename matches.
    for schema_path in adapters.glob("*.xsd"):
        # Compare filenames without case sensitivity.
        if schema_path.stem.casefold() == normalized:
            return schema_path

    # Fall back to component element declarations.
    for schema_path in adapters.glob("*.xsd"):
        schema = etree.parse(str(schema_path))

        # Scan each declared element in the schema.
        for element in schema.findall("xsd:element", namespaces=XSD_NAMESPACE):
            # Match component names without case sensitivity.
            if element.get("name", "").casefold() == normalized:
                return schema_path

    raise click.ClickException(f"Unknown component: {component}")


def summarize_component_schema(schema_path: Path, component: str) -> ComponentDetails:
    """Extract props, children support, and descriptions from a component schema."""

    schema = etree.parse(str(schema_path))
    normalized = component.casefold()
    element = None

    # Locate the requested root element.
    for candidate in schema.findall("xsd:element", namespaces=XSD_NAMESPACE):
        # Compare element names without case sensitivity.
        if candidate.get("name", "").casefold() == normalized:
            element = candidate
            break

    # Use the first element when the requested name is absent.
    if element is None:
        element = schema.find("xsd:element", namespaces=XSD_NAMESPACE)

    # Require at least one root element in the schema.
    if element is None:
        raise click.ClickException(f"Schema does not define a root element: {schema_path.name}")

    complex_type_name = element.get("type")

    # Components must reference a complex type.
    if not complex_type_name:
        raise click.ClickException(f"Schema is missing a type reference: {schema_path.name}")

    # Resolve the referenced complex type.
    complex_type = schema.find(f"xsd:complexType[@name='{complex_type_name}']", namespaces=XSD_NAMESPACE)
    if complex_type is None:
        raise click.ClickException(f"Schema does not define type {complex_type_name}")

    def collect_type_info(type_node: Any, seen: set[str] | None = None) -> ComponentTypeInfo:
        """Collect inherited attributes and child support from a complex type."""

        seen = seen or set()
        type_name = type_node.get("name")

        # Stop inherited type cycles.
        if type_name and type_name in seen:
            return {"props": [], "children_supported": False, "any_attribute": False}

        # Track named types during inheritance traversal.
        if type_name:
            seen.add(type_name)

        props: list[ComponentProp] = []
        any_attribute = type_node.find("xsd:anyAttribute", namespaces=XSD_NAMESPACE) is not None
        children_supported = type_node.find(".//xsd:any", namespaces=XSD_NAMESPACE) is not None

        extension = type_node.find("xsd:complexContent/xsd:extension", namespaces=XSD_NAMESPACE)

        # Include metadata inherited from base types.
        if extension is not None:
            base_name = extension.get("base")

            # Resolve a named base type when present.
            if base_name:
                base_type = schema.find(f"xsd:complexType[@name='{base_name}']", namespaces=XSD_NAMESPACE)

                # Merge inherited metadata when available.
                if base_type is not None:
                    base_info = collect_type_info(base_type, seen)
                    props.extend(base_info["props"])
                    children_supported = children_supported or bool(base_info["children_supported"])
                    any_attribute = any_attribute or bool(base_info["any_attribute"])

        # Collect attributes declared on this type.
        for attribute in type_node.findall(".//xsd:attribute", namespaces=XSD_NAMESPACE):
            restriction = attribute.find("xsd:simpleType/xsd:restriction", namespaces=XSD_NAMESPACE)
            values: list[str] = []

            # Capture explicit enumeration values.
            if restriction is not None:
                values = [
                    value
                    for entry in restriction.findall("xsd:enumeration", namespaces=XSD_NAMESPACE)
                    if isinstance((value := entry.get("value")), str)
                ]

            name = attribute.get("name", "")
            type_name = attribute.get("type", "xsd:string").replace("xsd:", "")

            props.append(
                {
                    "name": name,
                    "required": attribute.get("use") == "required",
                    "default": attribute.get("default"),
                    "values": values,
                    "type": type_name,
                }
            )

        return {
            "props": props,
            "children_supported": children_supported,
            "any_attribute": any_attribute,
        }

    description = ""
    annotation = element.find("xsd:annotation/xsd:documentation", namespaces=XSD_NAMESPACE)

    # Use element documentation as the summary.
    if annotation is not None and annotation.text:
        description = annotation.text.strip()

    type_info = collect_type_info(complex_type)
    props = type_info["props"]

    # Document State's dynamic field support.
    if normalized == "state":
        props.append({"name": "any", "required": False, "default": None, "values": [], "type": "any"})
    child_support = bool(type_info["children_supported"])
    children_description = ""
    child_annotation = complex_type.find("xsd:annotation/xsd:documentation", namespaces=XSD_NAMESPACE)

    # Use type documentation for child details.
    if child_annotation is not None and child_annotation.text:
        children_description = child_annotation.text.strip()

    # Provide a generic fallback summary.
    if not description:
        description = f"Renders the {element.get('name', schema_path.stem)} component."

    return {
        "name": element.get("name", schema_path.stem),
        "description": description,
        "props": props,
        "children_supported": child_support,
        "children_description": children_description,
        "any_attribute": bool(type_info["any_attribute"]),
    }


def render_component_docs(component: str) -> str:
    """Render a concise docs summary for a single XML component."""

    schema_path = resolve_component_schema(component)
    details = summarize_component_schema(schema_path, component)

    # Show paired tags for components with children.
    if details["children_supported"]:
        lines = [f"<{details['name']}> </{details['name']}> - {details['description']}"]

    # Show self-closing tags for leaf components.
    else:
        lines = [f"<{details['name']} /> - {details['description']}"]

    # Mention permissive attribute support.
    if details["any_attribute"]:
        lines.append("Attributes: additional arbitrary fields are allowed")

    lines.append("Props:")
    props = details["props"]

    # List known props when present.
    if props:
        # Render each prop with its metadata.
        for prop in props:
            prop_bits = ["required" if prop["required"] else "optional"]

            # Include documented defaults.
            if prop["default"] is not None:
                prop_bits.append(f"default={prop['default']}")

            # Include allowed values.
            if prop["values"]:
                prop_bits.append(f"values={', '.join(prop['values'])}")
            lines.append(f"- {prop['name']} ({'; '.join(prop_bits)}): {prop['type']}")

    # Show an explicit empty props marker.
    else:
        lines.append("- none")

    return "\n".join(lines)


@click.command(name="docs")
@click.argument("component", required=False)
def docs_command(component: str | None) -> None:
    """Show bundled XML docs for one component or all components."""

    # Render one component when requested.
    if component is not None:
        click.echo(render_component_docs(component))
        return

    adapters = ROOT / ".static" / "xsd" / "adapters"
    docs = []

    # Render only component schemas; shared type-only schemas do not have root elements.
    for schema_path in sorted(adapters.glob("*.xsd"), key=lambda path: path.stem.casefold()):
        schema = etree.parse(str(schema_path))
        if schema.find("xsd:element", namespaces=XSD_NAMESPACE) is None:
            continue
        docs.append(render_component_docs(schema_path.stem))

    click.echo("\n\n".join(docs))
