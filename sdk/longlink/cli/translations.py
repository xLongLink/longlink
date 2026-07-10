import json
import re
import click
from lxml import etree
from typing import TypeGuard
from pathlib import Path

PLURAL_KEYS = {"zero", "one", "two", "few", "many", "other"}
DEFAULT_PAGES_DIRECTORY = Path("src") / "pages"
DEFAULT_TRANSLATION_FILE = Path("src") / "i18n" / "en.json"
TRANSLATION_KEY_PATTERN = re.compile(r"^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$")


@click.group(name="translations")
def translations_command() -> None:
    """Manage the current application's XML translation catalog."""


@click.command(name="generate")
def generate_command() -> None:
    """Generate the current application's translation file from XML `i18n` keys."""

    app_root = Path.cwd()
    pages_directory = app_root / DEFAULT_PAGES_DIRECTORY
    translation_file = app_root / DEFAULT_TRANSLATION_FILE

    # Scan application XML pages and collect every declared translation key.
    xml_files = discover_xml_files(pages_directory)
    keys = collect_translation_keys(xml_files, app_root)

    # Preserve existing translations while normalizing the output structure.
    existing_catalog = load_translation_catalog(translation_file, app_root)
    flattened_catalog = flatten_translation_catalog(existing_catalog)
    generated_catalog = build_translation_catalog(keys, flattened_catalog)

    translation_file.parent.mkdir(parents=True, exist_ok=True)
    rendered_catalog = json.dumps(generated_catalog, indent=4, ensure_ascii=False) + "\n"
    translation_file.write_text(rendered_catalog, encoding="utf-8")

    click.echo(f"Generated {translation_file.relative_to(app_root)} from {len(keys)} translation keys.")


translations_command.add_command(generate_command)


def discover_xml_files(pages_directory: Path) -> list[Path]:
    """Return XML source files that can contribute translation keys."""

    # Treat missing page directories as empty applications.
    if not pages_directory.exists():
        return []

    return sorted(path for path in pages_directory.rglob("*.xml") if path.is_file())


def collect_translation_keys(xml_files: list[Path], app_root: Path) -> set[str]:
    """Collect every `i18n` key referenced by the XML sources."""

    keys: set[str] = set()

    # Parse each XML page and merge its declared keys.
    for path in xml_files:

        # Parse fragments without loading external resources.
        try:

            # Wrap fragments so mixed top-level XML snippets still parse cleanly.
            content = path.read_text(encoding="utf-8")
            parser = etree.XMLParser(load_dtd=False, no_network=True, resolve_entities=False)
            root = etree.fromstring(f"<root>{content}</root>", parser=parser)
        except etree.XMLSyntaxError as error:
            display_path = path.relative_to(app_root) if path.is_relative_to(app_root) else path
            raise click.ClickException(f"Invalid XML in {display_path}: {error}") from error

        # Visit every XML element because keys may appear at any depth.
        for element in root.iter():
            key = element.get("i18n")

            # Ignore elements that do not declare translation keys.
            if key:
                normalized_key = key.strip()

                # Reject fallback-like labels before they enter the catalog.
                if not is_translation_key(normalized_key):
                    display_path = path.relative_to(app_root) if path.is_relative_to(app_root) else path
                    raise click.ClickException(
                        f'Invalid translation key "{normalized_key}" in {display_path}. Use dotted keys like "tasks.title".'
                    )

                keys.add(normalized_key)

    return keys


def load_translation_catalog(path: Path, app_root: Path) -> dict[str, object]:
    """Load the existing translation catalog, if one is already present."""

    # Start from an empty catalog when no translation file exists.
    if not path.exists():
        return {}

    # Load the existing JSON so unchanged translations are preserved.
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        display_path = path.relative_to(app_root) if path.is_relative_to(app_root) else path
        raise click.ClickException(f"Invalid JSON in {display_path}: {error}") from error


def flatten_translation_catalog(value: object, prefix: str = "") -> dict[str, object]:
    """Flatten a nested translation tree into dotted keys."""

    # Preserve scalar leaves under their accumulated dotted key.
    if not is_translation_branch(value):
        return {prefix: value} if prefix else {}

    # Leave plural leaves intact so their category objects survive normalization.
    if is_plural_catalog(value):
        return {prefix: value} if prefix else {}

    flattened: dict[str, object] = {}

    # Recurse through nested namespaces to produce dotted keys.
    for key, entry in value.items():
        next_prefix = f"{prefix}.{key}" if prefix else key
        flattened.update(flatten_translation_catalog(entry, next_prefix))

    return flattened


def build_translation_catalog(keys: set[str], existing_catalog: dict[str, object]) -> dict[str, object]:
    """Build a normalized nested catalog from the discovered XML keys."""

    catalog: dict[str, object] = {}

    # Emit keys in stable order for deterministic catalog output.
    for key in sorted(keys):

        # Reuse the stored translation string or initialize a blank leaf.
        value = existing_catalog.get(key, "")
        assign_translation_value(catalog, key.split("."), value)

    return catalog


def is_translation_key(value: str) -> bool:
    """Return true when a value can be used as a LongLink translation catalog key."""

    return bool(TRANSLATION_KEY_PATTERN.fullmatch(value))


def assign_translation_value(target: dict[str, object], segments: list[str], value: object) -> None:
    """Store a translation leaf at the requested dotted path."""

    current = target

    # Walk or create the parent namespaces for the leaf value.
    for segment in segments[:-1]:

        # Reject namespace collisions like `items` versus `items.count`.
        entry = current.get(segment)

        # Create a namespace when this segment is new.
        if entry is None:
            entry = {}
            current[segment] = entry

        # Existing entries must be reusable translation namespaces.
        elif not is_translation_branch(entry) or is_plural_catalog(entry):
            raise click.ClickException(f"Translation key collision at {segment}")

        current = entry

    leaf = segments[-1]
    entry = current.get(leaf)

    # Reject replacing a namespace with a scalar translation.
    if is_translation_branch(entry) and not is_plural_catalog(entry):
        raise click.ClickException(f"Translation key collision at {'.'.join(segments)}")

    current[leaf] = value


def is_translation_branch(value: object) -> TypeGuard[dict[str, object]]:
    """Return true when a translation value is a string-keyed object."""

    return isinstance(value, dict) and all(isinstance(key, str) for key in value)


def is_plural_catalog(value: dict[str, object]) -> bool:
    """Return true when a translation leaf uses plural categories."""

    # Empty objects are namespaces, not plural leaves.
    if not value:
        return False

    # Every plural entry must use a known category and string value.
    for key, entry in value.items():

        # Reject unknown plural categories or non-string values.
        if key not in PLURAL_KEYS or not isinstance(entry, str):
            return False

    return True
