import yaml
from string import Template
from typing import cast
from pathlib import Path
from importlib.resources.abc import Traversable


def readyml_list(template_path: str | Path | Traversable, **context: object) -> list[dict[str, object]]:
    """Render one YAML template file into a manifest list."""

    source = Path(template_path) if isinstance(template_path, str) else template_path
    rendered = Template(source.read_text(encoding="utf-8")).substitute(**context)
    docs: list[dict[str, object]] = []

    # Parse each rendered YAML document separately.
    for document in yaml.safe_load_all(rendered):
        # Ignore empty YAML documents from separators.
        if document is None:
            continue

        # Manifests must render as mapping documents.
        if not isinstance(document, dict) or not all(isinstance(key, str) for key in document):
            raise ValueError("Rendered YAML templates must contain mapping documents")

        docs.append(cast(dict[str, object], document))

    # Reject templates that only render empty documents.
    if not docs:
        raise ValueError("Rendered YAML template did not contain any documents")

    return docs
