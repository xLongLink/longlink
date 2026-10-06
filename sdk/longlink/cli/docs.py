import typer
from pydantic import Field, BaseModel, TypeAdapter
from longlink.constants import ROOT
from longlink.cli.errors import CliError


class MemberDoc(BaseModel):
    """Describe one binding in a grouped runtime reference."""

    # Binding documentation.
    name: str
    description: str


class PropertyDoc(BaseModel):
    """Describe one public component prop from the generated declarations."""

    # Property contract.
    name: str
    type: str
    required: bool
    description: str = ""


class ComponentDoc(BaseModel):
    """Read the CLI fields from the shared generated JSX documentation catalog."""

    # Authoring documentation.
    name: str
    members: list[MemberDoc] = Field(default_factory=list)
    category: str
    properties: list[PropertyDoc] = Field(default_factory=list)
    declaration: str


def docs_command(component: str | None = None, category: str | None = None) -> None:
    """Show JSX APIs generated from the same declarations supplied to Solution editors."""

    # Validate packaged catalog data without parsing or executing JavaScript in Python.
    catalog = TypeAdapter(
        list[ComponentDoc],
    )
    components = catalog.validate_json((ROOT / ".static" / "jsx" / "components.json").read_text(encoding="utf-8"))
    categories = sorted({entry.category for entry in components})

    # Resolve documented categories and symbols case-insensitively at the CLI boundary.
    selected = next((name for name in categories if category and name.casefold() == category.casefold()), None)
    if category is not None and selected is None:
        raise CliError(f"Unknown category: {category}. Available categories: {', '.join(categories)}.")
    if component is not None:
        entry = next((entry for entry in components if entry.name.casefold() == component.casefold()), None)
        if entry is None:
            raise CliError(f"Unknown component: {component}. Run `longlink docs` to list available components.")

        # Render documented bindings as a readable list rather than type declarations.
        if entry.members:
            typer.echo(
                f"{entry.name} [{entry.category}]\n" + "\n\n".join(f"- {member.name}:\n  {member.description}" for member in entry.members)
            )
        else:
            typer.echo(
                f"{entry.name} [{entry.category}]\n"
                + ("\n\n".join(f"- {prop.name} ({prop.type}):\n  {prop.description}" for prop in entry.properties) or "No props.")
            )
        return

    # Explain the execution boundary before listing the JSX APIs that are actually available.
    typer.echo(
        "LongLink JSX View components\nExport one default React component from each .jsx file; no package imports or frontend build is required."
    )
    typer.echo("Use React state and controlled callbacks; express queries and ordered actions in ordinary JavaScript.")
    typer.echo(
        "Source runs in an opaque-origin sandbox. request() and navigate() access only the current Solution. Titles come from JSX filenames; tabs use the default icon."
    )
    for name in categories:
        if selected is None or name == selected:
            typer.echo(f"\n{name}\n" + "\n".join(f"- {entry.name}" for entry in components if entry.category == name))
