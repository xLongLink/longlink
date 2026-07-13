import re
import json
import click
from lxml import etree
from typing import TypeGuard
from pathlib import Path

PLURAL_KEYS = {"zero", "one", "two", "few", "many", "other"}
DEFAULT_TRANSLATION_FILE = Path("src") / "i18n" / "en.json"


@click.group(name="translations")
def translations_command() -> None:
    """Manage the current application's XML translation catalog."""


@click.command(name="generate")
def generate_command() -> None:
    """Generate the current application's translation file from XML `i18n` keys."""

    # Parse XML fragments without loading external resources.
    parser = etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)
    keys: set[str] = set()

    # Collect and validate translation keys from every application XML page.
    for path in sorted((Path("src") / "pages").rglob("*.xml")):
        if not path.is_file():
            continue

        try:
            content = path.read_text(encoding="utf-8")
            root = etree.fromstring(f"<root>{content}</root>", parser=parser)
        except etree.XMLSyntaxError as error:
            raise click.ClickException(f"Invalid XML in {path}: {error}") from error

        for element in root.iter():
            key = element.get("i18n")
            if not key:
                continue

            key = key.strip()
            if re.fullmatch(r"[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+", key) is None:
                raise click.ClickException(
                    f'Invalid translation key "{key}" in {path}. Use dotted keys like "tasks.title".'
                )

            keys.add(key)

    # Load the current catalog when it exists.
    source_catalog: object = {}
    if DEFAULT_TRANSLATION_FILE.exists():
        try:
            source_catalog = json.loads(
                DEFAULT_TRANSLATION_FILE.read_text(encoding="utf-8")
            )
        except json.JSONDecodeError as error:
            raise click.ClickException(
                f"Invalid JSON in {DEFAULT_TRANSLATION_FILE}: {error}"
            ) from error

    # Flatten existing leaves so their translations can be preserved by dotted key.
    existing_catalog: dict[str, object] = {}
    pending = [("", source_catalog)]
    while pending:
        prefix, value = pending.pop()
        if not is_translation_branch(value) or is_plural_catalog(value):
            if prefix:
                existing_catalog[prefix] = value
            continue

        for key, entry in value.items():
            next_prefix = f"{prefix}.{key}" if prefix else key
            pending.append((next_prefix, entry))

    # Build a deterministic nested catalog from the discovered keys.
    generated_catalog: dict[str, object] = {}
    for key in sorted(keys):
        segments = key.split(".")
        current = generated_catalog
        for segment in segments[:-1]:
            entry = current.setdefault(segment, {})
            if not is_translation_branch(entry) or is_plural_catalog(entry):
                raise click.ClickException(f"Translation key collision at {segment}")

            current = entry

        current[segments[-1]] = existing_catalog.get(key, "")

    # Write the generated catalog to the conventional application path.
    DEFAULT_TRANSLATION_FILE.parent.mkdir(parents=True, exist_ok=True)
    DEFAULT_TRANSLATION_FILE.write_text(
        json.dumps(generated_catalog, indent=4, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    click.echo(
        f"Generated {DEFAULT_TRANSLATION_FILE} from {len(keys)} translation keys."
    )


translations_command.add_command(generate_command)


def is_translation_branch(value: object) -> TypeGuard[dict[str, object]]:
    """Return true when a translation value is a string-keyed object."""

    return isinstance(value, dict) and all(isinstance(key, str) for key in value)


def is_plural_catalog(value: dict[str, object]) -> bool:
    """Return true when a translation leaf uses plural categories."""

    return (
        bool(value)
        and value.keys() <= PLURAL_KEYS
        and all(isinstance(entry, str) for entry in value.values())
    )
