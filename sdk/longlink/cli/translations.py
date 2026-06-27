from __future__ import annotations

import json
from pathlib import Path

import click
from lxml import etree

from longlink.constants import ROOT

PLURAL_KEYS = {"zero", "one", "two", "few", "many", "other"}
TRANSLATION_FILE = ROOT / ".static" / "new" / "src" / "i18n" / "en.json"


@click.group(name="translations")
def translations_command() -> None:
    """Manage the bundled XML translation catalog."""


@click.command(name="generate")
def generate_command() -> None:
    """Generate the bundled translation file from XML `i18n` keys."""

    # Scan the repository for XML fragments and collect every declared key.
    repo_root = ROOT.parents[1]
    xml_files = discover_xml_files(repo_root)
    keys = collect_translation_keys(xml_files)

    # Preserve existing translations while normalizing the output structure.
    existing_catalog = load_translation_catalog(TRANSLATION_FILE)
    flattened_catalog = flatten_translation_catalog(existing_catalog)
    generated_catalog = build_translation_catalog(keys, flattened_catalog)

    TRANSLATION_FILE.parent.mkdir(parents=True, exist_ok=True)
    rendered_catalog = json.dumps(generated_catalog, indent=4, ensure_ascii=False) + "\n"
    TRANSLATION_FILE.write_text(rendered_catalog, encoding="utf-8")

    click.echo(f"Generated {TRANSLATION_FILE.relative_to(repo_root)} from {len(keys)} translation keys.")


translations_command.add_command(generate_command)


def discover_xml_files(repo_root: Path) -> list[Path]:
    """Return XML source files that can contribute translation keys."""

    # Skip generated assets and local development directories.
    ignored_parts = {".git", ".venv", "build", "coverage", "dist", "node_modules", ".static"}
    files: list[Path] = []

    for path in repo_root.rglob("*.xml"):
        if ignored_parts.intersection(path.parts):
            continue

        files.append(path)

    return sorted(files)


def collect_translation_keys(xml_files: list[Path]) -> set[str]:
    """Collect every `i18n` key referenced by the XML sources."""

    keys: set[str] = set()

    for path in xml_files:
        try:
            # Wrap fragments so mixed top-level XML snippets still parse cleanly.
            content = path.read_text(encoding="utf-8")
            root = etree.fromstring(f"<root>{content}</root>")
        except etree.XMLSyntaxError as error:
            raise click.ClickException(f"Invalid XML in {path.relative_to(ROOT.parents[1])}: {error}") from error

        for element in root.iter():
            key = element.get("i18n")

            if key:
                keys.add(key.strip())

    return keys


def load_translation_catalog(path: Path) -> dict[str, object]:
    """Load the existing translation catalog, if one is already present."""

    if not path.exists():
        return {}

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise click.ClickException(f"Invalid JSON in {path.relative_to(ROOT.parents[1])}: {error}") from error


def flatten_translation_catalog(value: object, prefix: str = "") -> dict[str, object]:
    """Flatten a nested translation tree into dotted keys."""

    if not isinstance(value, dict):
        return {prefix: value} if prefix else {}

    # Leave plural leaves intact so their category objects survive normalization.
    if is_plural_catalog(value):
        return {prefix: value} if prefix else {}

    flattened: dict[str, object] = {}

    for key, entry in value.items():
        next_prefix = f"{prefix}.{key}" if prefix else key
        flattened.update(flatten_translation_catalog(entry, next_prefix))

    return flattened


def build_translation_catalog(keys: set[str], existing_catalog: dict[str, object]) -> dict[str, object]:
    """Build a normalized nested catalog from the discovered XML keys."""

    catalog: dict[str, object] = {}

    for key in sorted(keys):
        # Reuse the stored translation string or initialize a blank leaf.
        value = existing_catalog.get(key, "")
        assign_translation_value(catalog, key.split("."), value)

    return catalog


def assign_translation_value(target: dict[str, object], segments: list[str], value: object) -> None:
    """Store a translation leaf at the requested dotted path."""

    current = target

    for segment in segments[:-1]:
        # Reject namespace collisions like `items` versus `items.count`.
        entry = current.get(segment)

        if entry is None:
            entry = {}
            current[segment] = entry
        elif not isinstance(entry, dict) or is_plural_catalog(entry):
            raise click.ClickException(f"Translation key collision at {segment}")

        current = entry

    leaf = segments[-1]
    entry = current.get(leaf)

    if isinstance(entry, dict) and not is_plural_catalog(entry):
        raise click.ClickException(f"Translation key collision at {'.'.join(segments)}")

    current[leaf] = value


def is_plural_catalog(value: dict[str, object]) -> bool:
    """Return true when a translation leaf uses plural categories."""

    if not value:
        return False

    for key, entry in value.items():
        if key not in PLURAL_KEYS or not isinstance(entry, str):
            return False

    return True
