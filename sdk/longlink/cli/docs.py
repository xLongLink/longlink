import click
from lxml import etree
from pathlib import Path
from longlink.constants import ROOT

XSD_NAMESPACE = {"xsd": "http://www.w3.org/2001/XMLSchema"}


def resolve_component_schema(component: str) -> Path:
    """Resolve the bundled XSD schema for a documented XML component."""

    adapters = ROOT / ".static" / "xsd" / "adapters"
    normalized = component.casefold()

    for schema_path in adapters.glob("*.xsd"):
        if schema_path.stem.casefold() == normalized:
            return schema_path

    for schema_path in adapters.glob("*.xsd"):
        schema = etree.parse(str(schema_path))
        for element in schema.findall("xsd:element", namespaces=XSD_NAMESPACE):
            if element.get("name", "").casefold() == normalized:
                return schema_path

    raise click.ClickException(f"Unknown component: {component}")


def summarize_component_schema(schema_path: Path, component: str) -> dict[str, object]:
    """Extract props, children support, and descriptions from a component schema."""

    schema = etree.parse(str(schema_path))
    normalized = component.casefold()
    element = None

    for candidate in schema.findall("xsd:element", namespaces=XSD_NAMESPACE):
        if candidate.get("name", "").casefold() == normalized:
            element = candidate
            break

    if element is None:
        element = schema.find("xsd:element", namespaces=XSD_NAMESPACE)
    if element is None:
        raise click.ClickException(f"Schema does not define a root element: {schema_path.name}")

    complex_type_name = element.get("type")
    if not complex_type_name:
        raise click.ClickException(f"Schema is missing a type reference: {schema_path.name}")

    complex_type = schema.find(f"xsd:complexType[@name='{complex_type_name}']", namespaces=XSD_NAMESPACE)
    if complex_type is None:
        raise click.ClickException(f"Schema does not define type {complex_type_name}")

    def collect_type_info(type_node: etree._Element, seen: set[str] | None = None) -> dict[str, object]:
        """Collect inherited attributes and child support from a complex type."""

        seen = seen or set()
        type_name = type_node.get("name")
        if type_name and type_name in seen:
            return {"props": [], "children_supported": False, "any_attribute": False}

        if type_name:
            seen.add(type_name)

        props: list[dict[str, object]] = []
        any_attribute = type_node.find("xsd:anyAttribute", namespaces=XSD_NAMESPACE) is not None
        children_supported = type_node.find(".//xsd:any", namespaces=XSD_NAMESPACE) is not None

        extension = type_node.find("xsd:complexContent/xsd:extension", namespaces=XSD_NAMESPACE)
        if extension is not None:
            base_name = extension.get("base")
            if base_name:
                base_type = schema.find(f"xsd:complexType[@name='{base_name}']", namespaces=XSD_NAMESPACE)
                if base_type is not None:
                    base_info = collect_type_info(base_type, seen)
                    props.extend(base_info["props"])
                    children_supported = children_supported or bool(base_info["children_supported"])
                    any_attribute = any_attribute or bool(base_info["any_attribute"])

        for attribute in type_node.findall(".//xsd:attribute", namespaces=XSD_NAMESPACE):
            restriction = attribute.find("xsd:simpleType/xsd:restriction", namespaces=XSD_NAMESPACE)
            values = []
            if restriction is not None:
                values = [entry.get("value") for entry in restriction.findall("xsd:enumeration", namespaces=XSD_NAMESPACE)]

            name = attribute.get("name", "")
            type_name = attribute.get("type", "xsd:string").replace("xsd:", "")

            props.append(
                {
                    "name": name,
                    "required": attribute.get("use") == "required",
                    "default": attribute.get("default"),
                    "values": [value for value in values if value],
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
    if annotation is not None and annotation.text:
        description = annotation.text.strip()

    type_info = collect_type_info(complex_type)
    props = type_info["props"]
    if normalized == "state":
        props.append({"name": "any", "required": False, "default": None, "values": [], "type": "any"})
    child_support = bool(type_info["children_supported"])
    children_description = ""
    child_annotation = complex_type.find("xsd:annotation/xsd:documentation", namespaces=XSD_NAMESPACE)
    if child_annotation is not None and child_annotation.text:
        children_description = child_annotation.text.strip()

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

    if details["children_supported"]:
        lines = [f"<{details['name']}> </{details['name']}> - {details['description']}"]
    else:
        lines = [f"<{details['name']} /> - {details['description']}"]

    if details["any_attribute"]:
        lines.append("Attributes: additional arbitrary fields are allowed")

    lines.append("Props:")
    props = details["props"]
    if props:
        for prop in props:
            prop_bits = ["required" if prop["required"] else "optional"]
            if prop["default"] is not None:
                prop_bits.append(f"default={prop['default']}")
            if prop["values"]:
                prop_bits.append(f"values={', '.join(prop['values'])}")
            lines.append(f"- {prop['name']} ({'; '.join(prop_bits)}): {prop['type']}")
    else:
        lines.append("- none")

    return "\n".join(lines)


@click.command(name="docs")
@click.argument("component", required=False)
def docs_command(component: str | None) -> None:
    """Show bundled XML docs for one component or all components."""

    if component is not None:
        click.echo(render_component_docs(component))
        return

    adapters = ROOT / ".static" / "xsd" / "adapters"
    docs = [
        render_component_docs(schema_path.stem)
        for schema_path in sorted(adapters.glob("*.xsd"), key=lambda path: path.stem.casefold())
    ]
    click.echo("\n\n".join(docs))
