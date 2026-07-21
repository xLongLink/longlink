import re
import json
import click
from lxml import etree
from pathlib import Path

DEFAULT_TRANSLATION_FILE = Path("src") / "i18n" / "en.json"
TRANSLATION_KEY_PATTERN = re.compile(r"[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+")


@click.group(name="translations")
def translations_command() -> None:
    """Manage the current application's XML translation catalog."""


@click.command(name="generate")
def generate_command() -> None:
    """Generate the current application's translation file from XML `i18n` keys."""

    # Load and validate the current native Astryx catalog when it exists.
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

    if not isinstance(source_catalog, dict):
        raise click.ClickException(
            f"Invalid translation catalog in {DEFAULT_TRANSLATION_FILE}: root must be an object."
        )

    existing_catalog: dict[str, dict[str, str]] = {}
    for key, entry in source_catalog.items():
        if TRANSLATION_KEY_PATTERN.fullmatch(key) is None:
            raise click.ClickException(
                f'Invalid translation key "{key}" in {DEFAULT_TRANSLATION_FILE}. '
                'Use dotted keys like "tasks.title".'
            )

        if not isinstance(entry, dict):
            raise click.ClickException(
                f'Invalid translation entry "{key}" in {DEFAULT_TRANSLATION_FILE}: expected an object.'
            )

        unsupported_fields = set(entry) - {"defaultMessage", "description"}
        if unsupported_fields:
            fields = ", ".join(sorted(unsupported_fields))
            raise click.ClickException(
                f'Invalid translation entry "{key}" in {DEFAULT_TRANSLATION_FILE}: unsupported fields: {fields}.'
            )

        default_message = entry.get("defaultMessage")
        if not isinstance(default_message, str):
            raise click.ClickException(
                f'Invalid translation entry "{key}" in {DEFAULT_TRANSLATION_FILE}: defaultMessage must be a string.'
            )

        description = entry.get("description")
        if "description" in entry and not isinstance(description, str):
            raise click.ClickException(
                f'Invalid translation entry "{key}" in {DEFAULT_TRANSLATION_FILE}: description must be a string.'
            )

        existing_catalog[key] = {
            "defaultMessage": default_message,
            **({"description": description} if isinstance(description, str) else {}),
        }

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
            if TRANSLATION_KEY_PATTERN.fullmatch(key) is None:
                raise click.ClickException(
                    f'Invalid translation key "{key}" in {path}. Use dotted keys like "tasks.title".'
                )

            keys.add(key)

    # Build a deterministic flat catalog and preserve entries by exact key.
    generated_catalog: dict[str, dict[str, str]] = {}
    for key in sorted(keys):
        generated_catalog[key] = existing_catalog.get(key, {"defaultMessage": ""})

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
