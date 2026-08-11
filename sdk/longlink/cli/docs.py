import click
import xmlschema
from typing import TypedDict
from pathlib import Path
from functools import cache
from longlink.constants import ROOT
from xmlschema.validators import XsdGroup, XsdAttribute, XsdComplexType


class ComponentProp(TypedDict):
    """Describe one XML component attribute."""

    name: str
    type: str
    values: list[str]
    default: str | None
    required: bool


class ComponentDetails(TypedDict):
    """Describe rendered XML component documentation data."""

    name: str
    props: list[ComponentProp]
    description: str
    any_attribute: bool
    children_supported: bool


@cache
def load_schema(schema_path: Path) -> xmlschema.XMLSchema10:
    """Load and cache one bundled component schema with includes resolved."""

    return xmlschema.XMLSchema(schema_path)


def resolve_component_schema(component: str) -> Path:
    """Resolve the bundled XSD schema for a documented XML component."""

    adapters = ROOT / ".static" / "xsd" / "adapters"
    normalized = component.casefold()

    # Prefer direct schema filename matches.
    schema_path = next((path for path in adapters.glob("*.xsd") if path.stem.casefold() == normalized), None)
    if schema_path is not None:
        return schema_path

    # Fall back to component element declarations.
    for schema_path in adapters.glob("*.xsd"):
        schema = load_schema(schema_path)
        if any(name.casefold() == normalized for name in schema.elements):
            return schema_path

    raise click.ClickException(f"Unknown component: {component}")


def summarize_component_schema(schema_path: Path, component: str) -> ComponentDetails:
    """Extract props, children support, and descriptions from a component schema."""

    schema = load_schema(schema_path)
    normalized = component.casefold()

    # Resolve the requested element, falling back to the schema's first root element.
    element = next((candidate for name, candidate in schema.elements.items() if name.casefold() == normalized), None)
    if element is None:
        element = next(iter(schema.elements.values()), None)
    if element is None:
        raise click.ClickException(f"Schema does not define a root element: {schema_path.name}")

    # Components must resolve to a complex type.
    complex_type = element.type
    if not isinstance(complex_type, XsdComplexType):
        raise click.ClickException(f"Schema does not define a complex component type: {schema_path.name}")

    # xmlschema exposes inherited attributes with referenced simple types already resolved.
    props: list[ComponentProp] = []
    for name, attribute in complex_type.attributes.items():
        if name is None or not isinstance(attribute, XsdAttribute):
            continue
        props.append(
            {
                "name": name,
                "type": attribute.type.local_name or "string",
                "values": [str(value) for value in attribute.type.enumeration or []],
                "default": str(attribute.default) if attribute.default is not None else None,
                "required": attribute.use == "required",
            }
        )

    # Any declared or wildcard element content requires paired component tags.
    content = complex_type.content
    child_support = isinstance(content, XsdGroup) and next(content.iter_elements(), None) is not None

    # Provide a generic fallback summary.
    description = str(element.annotation).strip() if element.annotation is not None else ""
    if not description:
        description = f"Renders the {element.local_name or schema_path.stem} component."

    return {
        "name": element.local_name or schema_path.stem,
        "description": description,
        "props": props,
        "children_supported": child_support,
        "any_attribute": None in complex_type.attributes,
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

    # List known props when present.
    props = details["props"]
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

    # Prepare the adapter directory and collected documentation output.
    adapters = ROOT / ".static" / "xsd" / "adapters"
    docs = []

    # Render every declared component, including data-oriented child tags in grouped schemas.
    for schema_path in sorted(adapters.glob("*.xsd"), key=lambda path: path.stem.casefold()):
        schema = load_schema(schema_path)
        for name in schema.elements:
            docs.append(render_component_docs(name))

    click.echo("\n\n".join(docs))
