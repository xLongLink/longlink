import yaml
import typer
from longlink.constants import ROOT


def docs_command(component: str | None = None, category: str | None = None) -> None:
    """Show JSX APIs generated from the same declarations supplied to Solution editors."""

    # Read the generated, packaged YAML catalog without reconstructing documentation models.
    components = yaml.safe_load((ROOT / ".static" / "jsx" / "components.yml").read_text(encoding="utf-8"))

    # Resolve documented categories and symbols case-insensitively at the CLI boundary.
    categories = sorted({entry["category"] for entry in components}) if component is None or category is not None else []
    selected = None
    if category is not None:
        selected = next((name for name in categories if name.casefold() == category.casefold()), None)
        if selected is None:
            raise typer.TyperException(f"Unknown category: {category}. Available categories: {', '.join(categories)}.")

    # Resolve an individual symbol after validating any explicit category.
    if component is not None:
        entry = next((entry for entry in components if entry["name"].casefold() == component.casefold()), None)
        if entry is None:
            raise typer.TyperException(f"Unknown component: {component}. Run `longlink docs` to list available components.")

        # Render documented bindings as a readable list rather than type declarations.
        members = entry.get("members", [])
        if members:
            body = "\n\n".join(f"- {member['name']}:\n  {member['description']}" for member in members)
        else:
            body = (
                "\n\n".join(f"- {prop['name']} ({prop['type']}):\n  {prop.get('description', '')}" for prop in entry.get("properties", []))
                or "No props."
            )
        typer.echo(f"{entry['name']} [{entry['category']}]\n" + body)
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
            typer.echo(f"\n{name}\n" + "\n".join(f"- {entry['name']}" for entry in components if entry["category"] == name))
